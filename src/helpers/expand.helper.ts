import {expandLogic} from '../config/expand.config'
import {ResellersController} from '../api/resellers/resellers.controller'
import {ContractsController} from '../api/contracts/contracts.controller'
import {CustomercontactsController} from '../api/customercontacts/customercontacts.controller'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {UnprocessableEntityException} from '@nestjs/common'

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
    async expandObjects(responseList: any, parentObject: any, request: ServiceRequest) {
        const firstObjectToExpand = request.query.expand.split(".")[0]
        if (!parentObject.includes(firstObjectToExpand) || !expandLogic[firstObjectToExpand] || !expandLogic[firstObjectToExpand].roles.includes(request.user.role)) {
            if (await this.handleSoftExpand(request, `Expanding ${firstObjectToExpand} not allowed or impossible`))
                return
        }
        const nextObjectsToExpand = request.query.expand.substring(request.query.expand.indexOf('.') + 1)
        for (let i = 0; i < responseList.length; i++) {
            const controller = expandLogic[firstObjectToExpand].controller
            let returnObject
            try {
                returnObject = await this?.[controller]?.read(responseList[i][`${firstObjectToExpand}`], request)
            } catch(err) {
                if (await this.handleSoftExpand(request, `Cannot expand field ${firstObjectToExpand}`))
                    continue
            }
            if (nextObjectsToExpand && returnObject != null)
                await this.expandObject(returnObject, nextObjectsToExpand, request)
            const newProp = `${firstObjectToExpand}_expand`
            responseList[i][`${newProp}`] = returnObject
        }
    }

    /**
     * Recursively expands fields and adds them to the parentObject
     * @param parentObject
     * @param expandObjects - a string of fields to be expanded, split by dots
     * @param request
     */
    async expandObject(parentObject: any, expandObjects: string, request: ServiceRequest){
        const firstObjectToExpand = expandObjects.split(".")[0]
        const nextObjectsToExpand = expandObjects.substring(request.query.expand.indexOf('.') + 1)
        if (parentObject[firstObjectToExpand] && expandLogic[firstObjectToExpand] && expandLogic[firstObjectToExpand].roles.includes(request.user.role)) {
            const controller = expandLogic[firstObjectToExpand].controller
            let returnObject
            try {
                returnObject = await this?.[controller]?.read(parentObject[`${firstObjectToExpand}`], request)
            } catch(err) {
                if (await this.handleSoftExpand(request, `Cannot expand field ${firstObjectToExpand}`))
                    return
            }
            if (nextObjectsToExpand && returnObject != null)
                await this.expandObject(returnObject, nextObjectsToExpand, request)
            const newProp = `${firstObjectToExpand}_expand`
            parentObject[`${newProp}`] = returnObject
        } else {
            if (await this.handleSoftExpand(request, `Expanding ${firstObjectToExpand} not allowed or impossible`))
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
        if (request.query.soft_expand === "1")
            return true
        else
            throw new UnprocessableEntityException(errorMessage)
    }
}

