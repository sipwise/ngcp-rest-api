import {expandLogic} from '../config/expand.config'
import {ResellersController} from '../api/resellers/resellers.controller'
import {ContractsController} from '../api/contracts/contracts.controller'
import {CustomercontactsController} from '../api/customercontacts/customercontacts.controller'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ProtectedReadCall} from './protocted-controller-calls.helper'

@Injectable()
export class ExpandHelper {
    constructor(
        private readonly resellersController?: ResellersController,
        private readonly customercontactsController?: CustomercontactsController,
        private readonly contractsController?: ContractsController,
    ) {
    }

    /**
     * Uses the response that is going to be returned and expands multiple fields at once specified by comma(,)
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param request
     */
    async handleMultiFieldExpand(responseList: any, parentObject: any, request: ServiceRequest) {
        const fieldsToExpand = request.query.expand.split(',')
        for (let i = 0; i < fieldsToExpand.length; i++) {
            if (!parentObject.includes(fieldsToExpand[i]) || !expandLogic[fieldsToExpand[i]]) {
                if (await this.handleSoftExpand(request, `Expanding ${fieldsToExpand[i]} not allowed or impossible`))
                    return
            }
            let j = 0
            do {
                const controller = expandLogic[fieldsToExpand[i]].controller
                let returnObject
                try {
                    returnObject = (responseList.length == undefined) ?
                        await ProtectedReadCall(this?.[controller], responseList[`${fieldsToExpand[i]}`], request) :
                        await ProtectedReadCall(this?.[controller], responseList[j][`${fieldsToExpand[i]}`], request)
                } catch (err) {
                    if (await this.handleSoftExpand(request, `Cannot expand field ${fieldsToExpand[i]}`))
                        continue
                }
                const newProp = `${fieldsToExpand[i]}_expand`
                if (responseList.length == undefined) {
                    responseList[`${newProp}`] = returnObject
                    break
                } else {
                    responseList[j][`${newProp}`] = returnObject
                }
            } while (++j < responseList.length)
        }
    }
    /**
     * Uses the response that is going to be returned and expands the fields specified by dots(.) with the help of a recursive function
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param request
     */
    async handleNestedExpand(responseList: any, parentObject: any, request: ServiceRequest) {
        const firstFieldToExpand = request.query.expand.split('.')[0]
        if (!parentObject.includes(firstFieldToExpand) || !expandLogic[firstFieldToExpand]) {
            if (await this.handleSoftExpand(request, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }
        let nextFieldsToExpand = null
        if (request.query.expand.indexOf('.') !== -1) {
            nextFieldsToExpand = request.query.expand.substring(request.query.expand.indexOf('.') + 1)
        }
        let i = 0
        do {
            const controller = expandLogic[firstFieldToExpand].controller
            let returnObject
            try {
                returnObject = (responseList.length == undefined) ?
                    await ProtectedReadCall(this?.[controller], responseList[`${firstFieldToExpand}`], request) :
                    await ProtectedReadCall(this?.[controller], responseList[i][`${firstFieldToExpand}`], request)
            } catch (err) {
                if (await this.handleSoftExpand(request, `Cannot expand field ${firstFieldToExpand}`))
                    continue
            }
            if (nextFieldsToExpand && returnObject != null)
                await this.expandSingleObject(returnObject, nextFieldsToExpand, request)
            const newProp = `${firstFieldToExpand}_expand`
            if (responseList.length == undefined) {
                responseList[`${newProp}`] = returnObject
                break
            } else {
                responseList[i][`${newProp}`] = returnObject
            }
        } while (++i < responseList.length)
    }
    /**
     * Routes to the proper method based on whether the expand parameter in the request has commas(,) or dots(.).
     * In case of commas, this is going to be a multi-field expand where multiple fields at the same object level
     * will be expanded at once. In case of dots, this is going to be a nested expand where the objects will be
     * expanded recursively. In case there are no dots or commas, this will be handled as a nested expand by default.
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param request
     */
    async expandObjects(responseList: any, parentObject: any, request: ServiceRequest) {
        const multiFieldExpand = request.query.expand.indexOf(',') != -1 &&
            (request.query.expand.indexOf('.') == -1 || request.query.expand.indexOf(',') < request.query.expand.indexOf('.'))
        if (multiFieldExpand)
            await this.handleMultiFieldExpand(responseList, parentObject, request)
        else
            await this.handleNestedExpand(responseList, parentObject, request)
    }

    /**
     * Recursively expands fields and adds them to the parentObject
     * @param parentObject
     * @param expandFields - a string of fields to be expanded, split by dots
     * @param request
     */
    async expandSingleObject(parentObject: any, expandFields: string, request: ServiceRequest) {
        const firstFieldToExpand = expandFields.split('.')[0]
        let nextFieldsToExpand = null
        if (expandFields.indexOf('.') !== -1) {
            nextFieldsToExpand = expandFields.substring(expandFields.indexOf('.') + 1)
        }
        if (parentObject[firstFieldToExpand] && expandLogic[firstFieldToExpand]) {
            const controller = expandLogic[firstFieldToExpand].controller
            let returnObject
            try {
                returnObject = await ProtectedReadCall(this?.[controller], parentObject[`${firstFieldToExpand}`], request)
            } catch (err) {
                if (await this.handleSoftExpand(request, `Cannot expand field ${firstFieldToExpand}`))
                    return
            }
            if (nextFieldsToExpand && returnObject != null)
                await this.expandSingleObject(returnObject, nextFieldsToExpand, request)
            const newProp = `${firstFieldToExpand}_expand`
            parentObject[`${newProp}`] = returnObject
        } else {
            if (await this.handleSoftExpand(request, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }
    }

    /**
     * Handles the case of receiving an exception when trying to expand a field.
     * If the soft_expand parameter has been provided, the response will be unaffected.
     * If not, an exception will be thrown and the response will contain "Not Found"
     * @param request
     * @param errorMessage
     */
    async handleSoftExpand(request: ServiceRequest, errorMessage: string) {
        if (request.query.soft_expand === '1')
            return true
        else
            throw new UnprocessableEntityException(errorMessage)
    }
}

