import {expandLogic} from '../config/expand.config'
import {ResellersController} from '../api/resellers/resellers.controller'
import {ContractsController} from '../api/contracts/contracts.controller'
import {CustomercontactsController} from '../api/customercontacts/customercontacts.controller'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {UnprocessableEntityException} from '@nestjs/common'
import {ProtectedReadCall} from './protocted-controller-calls.helper'

export class ExpandHelper {

    constructor(
        private readonly resellersController?: ResellersController,
        private readonly customercontactsController?: CustomercontactsController,
        private readonly contractsController?: ContractsController,
    ) {
    }

    /**
     * Uses the response that is going to be returned and expands the fields
     * requested for every object in the list with the help of the recursive expandObject function
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param request
     */
    async expandMultipleObjects(responseList: any, parentObject: any, request: ServiceRequest) {
        const firstFieldToExpand = request.query.expand.split('.')[0]
        if (!parentObject.includes(firstFieldToExpand) || !expandLogic[firstFieldToExpand]) {
            if (await this.handleSoftExpand(request, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }
        let nextFieldsToExpand = null
        if (request.query.expand.indexOf('.') !== -1) {
            nextFieldsToExpand = request.query.expand.substring(request.query.expand.indexOf('.') + 1)
        }
        for (let i = 0; i < responseList.length; i++) {
            const controller = expandLogic[firstFieldToExpand].controller
            let returnObject
            try {
                returnObject = await ProtectedReadCall(this?.[controller], responseList[i][`${firstFieldToExpand}`], request)
            } catch (err) {
                if (await this.handleSoftExpand(request, `Cannot expand field ${firstFieldToExpand}`))
                    continue
            }
            if (nextFieldsToExpand && returnObject != null)
                await this.expandSingleObject(returnObject, nextFieldsToExpand, request)
            const newProp = `${firstFieldToExpand}_expand`
            responseList[i][`${newProp}`] = returnObject
        }
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

