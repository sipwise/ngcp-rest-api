import {Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ModuleRef, Reflector} from '@nestjs/core'

import {ContactController} from '~/api/contacts/contact.controller'
import {ContractController} from '~/api/contracts/contract.controller'
import {ResellerController} from '~/api/resellers/reseller.controller'
import {RewriteRuleSetController} from '~/api/rewrite-rules/sets/rewrite-rule-set.controller'
import {CrudController} from '~/controllers/crud.controller'
import {RequestDto} from '~/dto/request.dto'
import {ResponseDto} from '~/dto/response.dto'
import {ProtectedReadCall} from '~/helpers/protected-controller-calls.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ExpandHelper {
    private readonly reflector = new Reflector()
    private readonly log = new LoggerService(ExpandHelper.name)
    private readonly controllersMap:  Record<string, CrudController<RequestDto, ResponseDto>> = {}

    constructor(
        private readonly moduleRef: ModuleRef,
    ) {}

    async onModuleInit(): Promise<void> {
        const controllersToRetrieve = [
            {key: 'resellerController', name: ResellerController},
            {key: 'contactController', name: ContactController},
            {key: 'contractController', name: ContractController},
            {key: 'rewriteRuleSetController', name: RewriteRuleSetController},
            // Add other controllers here as needed
        ]
        for (const {key, name} of controllersToRetrieve) {
            const controller = this.moduleRef.get<CrudController<RequestDto, ResponseDto>>(name, {strict: false})
            if (controller) {
                this.controllersMap[key] = controller
            } else {
                this.log.warn(`Controller ${name} could not be found during module initialization.`)
            }
        }
    }

    /**
     * Checks if the field is expandable and if it exists in the first object of the response list
     * @param responselist - List of objects that we are going to expand based on the fields requested
     * @param field - Field that we are going to check if it is expandable
     * @returns [boolean,string] - A tuple containing a boolean and a string. The boolean is true if the field is expandable, false otherwise.
     */
    private isFieldExpandable(responselist: ResponseDto[], field: string): [boolean,string] {
        if (responselist.length === 0) {
            return [false, '']
        }

        if (!(field in responselist[0])) {
            return [false, '']
        }

        const isExpandable = this.reflector.get<boolean>(`${field}:isExpandable`, responselist[0] as never)
        const controller = this.reflector.get<string>(`${field}:controller`, responselist[0] as never)

        if (!isExpandable) {
            return [false, '']
        }

        if (!controller) {
            return [false, '']
        }

        return [true, controller]
    }

    /**
     * Uses the response that is going to be returned and expands multiple fields at once specified by comma(,)
     * @param responseList - List of objects that we are going to expand based on the fields requested
     * @param parentObject - Contains the object keys. Used to check whether the field requested to be expanded belongs to them
     * @param sr
     */
    async handleMultiFieldExpand(responseList: ResponseDto[], parentObject: string[], sr: ServiceRequest): Promise<void> {
        const fieldsToExpand = sr.query.expand.toString().split(',')
        for (let i = 0; i < fieldsToExpand.length; i++) {
            const [isExpandable, controller] = this.isFieldExpandable(responseList, fieldsToExpand[i])
            if (!isExpandable || !this.controllersMap[controller] || !parentObject.includes(fieldsToExpand[i])) {
                if (!this.controllersMap[controller])
                    this.log.error(`Trying to expand ${fieldsToExpand[i]} but provided controller: ${controller} is not found`)

                if (await this.handleSoftExpand(sr, `Expanding ${fieldsToExpand[i]} not allowed or impossible`))
                    return
            }
            let j = 0
            do {
                if (responseList[j][`${fieldsToExpand[i]}`] == null)
                    continue

                let returnObject
                try {
                    returnObject = await ProtectedReadCall(this.controllersMap[controller], responseList[j][`${fieldsToExpand[i]}`], sr)
                } catch {
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
    async handleNestedExpand(responseList: ResponseDto[], parentObject: string[], sr: ServiceRequest): Promise<void> {
        const firstFieldToExpand = sr.query.expand.toString().split('.')[0]
        const [isExpandable, controller] = this.isFieldExpandable(responseList, firstFieldToExpand)
        if (!isExpandable || !this.controllersMap[controller] || !parentObject.includes(firstFieldToExpand)) {
            if(!this.controllersMap[controller])
                this.log.error(`Trying to expand ${firstFieldToExpand} but provided controller: ${controller} is not found`)

            if (await this.handleSoftExpand(sr, `Expanding ${firstFieldToExpand} not allowed or impossible`))
                return
        }

        let nextFieldsToExpand = null
        if (sr.query.expand.toString().indexOf('.') !== -1) {
            nextFieldsToExpand = sr.query.expand.toString().substring(sr.query.expand.toString().indexOf('.') + 1)
        }
        let i = 0
        do {
            if (responseList[i][`${firstFieldToExpand}`] == null) 
                continue

            let returnObject
            try {
                returnObject =
                    await ProtectedReadCall(this.controllersMap[controller], responseList[i][`${firstFieldToExpand}`], sr)
            } catch{
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
    async expandObjects(responseList: ResponseDto[], parentObject: string[], sr: ServiceRequest): Promise<void> {
        const multiFieldExpand = sr.query.expand.toString().indexOf(',') != -1 &&
            (sr.query.expand.toString().indexOf('.') == -1 || sr.query.expand.toString().indexOf(',') < sr.query.expand.toString().indexOf('.'))
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
    async expandSingleObject(parentObject: ResponseDto, expandFields: string, sr: ServiceRequest): Promise<void> {
        const firstFieldToExpand = expandFields.split('.')[0]
        let nextFieldsToExpand = null
        if (expandFields.indexOf('.') !== -1) {
            nextFieldsToExpand = expandFields.substring(expandFields.indexOf('.') + 1)
        }
        const [isExpandable, controller] = this.isFieldExpandable([parentObject], firstFieldToExpand)
        if (parentObject[firstFieldToExpand] && isExpandable && this.controllersMap[controller]) {
            let returnObject
            try {
                returnObject = await ProtectedReadCall(this?.controllersMap[controller], parentObject[`${firstFieldToExpand}`], sr)
            } catch {
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
    async handleSoftExpand(sr: ServiceRequest, errorMessage: string): Promise<boolean> {
        if (sr.query.soft_expand === '1')
            return true
        else
            throw new UnprocessableEntityException(errorMessage)
    }
}

