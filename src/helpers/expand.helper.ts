import {expandLogic} from '../config/expand.config'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ProtectedReadCall} from './protected-controller-calls.helper'
import {ContactController} from '../api/contacts/contact.controller'
import {ResellerController} from '../api/resellers/reseller.controller'
import {ContractController} from '../api/contracts/contract.controller'

@Injectable()
export class ExpandHelper {
    constructor(
        private readonly resellerController?: ResellerController,
        private readonly contactController?: ContactController,
        private readonly contractController?: ContractController,
    ) {
    }

    /**
     * Uses the response that is going to be returned and expands multiple fields at once specified by comma(,)
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param sr
     */
    async handleMultiFieldExpand(responseList: any, parentObject: any, sr: ServiceRequest) {
        const fieldsToExpand = sr.query.expand.split(',')
        for (let i = 0; i < fieldsToExpand.length; i++) {
            if (!parentObject.includes(fieldsToExpand[i]) || !expandLogic[fieldsToExpand[i]]) {
                if (await this.handleSoftExpand(sr, `Expanding ${fieldsToExpand[i]} not allowed or impossible`))
                    return
            }
            let j = 0
            do {
                const controller = expandLogic[fieldsToExpand[i]].controller
                let returnObject
                try {
                    returnObject = (responseList.length == undefined) ?
                        await ProtectedReadCall(this?.[controller], responseList[`${fieldsToExpand[i]}`], sr) :
                        await ProtectedReadCall(this?.[controller], responseList[j][`${fieldsToExpand[i]}`], sr)
                } catch (err) {
                    if (await this.handleSoftExpand(sr, `Cannot expand field ${fieldsToExpand[i]}`))
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
     * @param sr
     */
    async handleNestedExpand(responseList: any, parentObject: any, sr: ServiceRequest) {
        const firstFieldToExpand = sr.query.expand.split('.')[0]
        if (!parentObject.includes(firstFieldToExpand) || !expandLogic[firstFieldToExpand]) {
            if (await this.handleSoftExpand(sr, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }
        let nextFieldsToExpand = null
        if (sr.query.expand.indexOf('.') !== -1) {
            nextFieldsToExpand = sr.query.expand.substring(sr.query.expand.indexOf('.') + 1)
        }
        let i = 0
        do {
            const controller = expandLogic[firstFieldToExpand].controller
            let returnObject
            try {
                returnObject = (responseList.length == undefined) ?
                    await ProtectedReadCall(this?.[controller], responseList[`${firstFieldToExpand}`], sr) :
                    await ProtectedReadCall(this?.[controller], responseList[i][`${firstFieldToExpand}`], sr)
            } catch (err) {
                if (await this.handleSoftExpand(sr, `Cannot expand field ${firstFieldToExpand}`))
                    continue
            }
            if (nextFieldsToExpand && returnObject != null)
                await this.expandSingleObject(returnObject, nextFieldsToExpand, sr)
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
     * @param sr
     */
    async expandObjects(responseList: any, parentObject: any, sr: ServiceRequest) {
        const multiFieldExpand = sr.query.expand.indexOf(',') != -1 &&
            (sr.query.expand.indexOf('.') == -1 || sr.query.expand.indexOf(',') < sr.query.expand.indexOf('.'))
        if (multiFieldExpand)
            await this.handleMultiFieldExpand(responseList, parentObject, sr)
        else
            await this.handleNestedExpand(responseList, parentObject, sr)
    }

    /**
     * Recursively expands fields and adds them to the parentObject
     * @param parentObject
     * @param expandFields - a string of fields to be expanded, split by dots
     * @param sr
     */
    async expandSingleObject(parentObject: any, expandFields: string, sr: ServiceRequest) {
        const firstFieldToExpand = expandFields.split('.')[0]
        let nextFieldsToExpand = null
        if (expandFields.indexOf('.') !== -1) {
            nextFieldsToExpand = expandFields.substring(expandFields.indexOf('.') + 1)
        }
        if (parentObject[firstFieldToExpand] && expandLogic[firstFieldToExpand]) {
            const controller = expandLogic[firstFieldToExpand].controller
            let returnObject
            try {
                returnObject = await ProtectedReadCall(this?.[controller], parentObject[`${firstFieldToExpand}`], sr)
            } catch (err) {
                if (await this.handleSoftExpand(sr, `Cannot expand field ${firstFieldToExpand}`))
                    return
            }
            if (nextFieldsToExpand && returnObject != null)
                await this.expandSingleObject(returnObject, nextFieldsToExpand, sr)
            const newProp = `${firstFieldToExpand}_expand`
            parentObject[`${newProp}`] = returnObject
        } else {
            if (await this.handleSoftExpand(sr, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }
    }

    /**
     * Handles the case of receiving an exception when trying to expand a field.
     * If the soft_expand parameter has been provided, the response will be unaffected.
     * If not, an exception will be thrown and the response will contain "Not Found"
     * @param sr
     * @param errorMessage
     */
    async handleSoftExpand(sr: ServiceRequest, errorMessage: string) {
        if (sr.query.soft_expand === '1')
            return true
        else
            throw new UnprocessableEntityException(errorMessage)
    }
}

