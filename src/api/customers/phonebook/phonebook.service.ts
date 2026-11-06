import {Inject, Injectable, NotFoundException, StreamableFile} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerPhonebookView} from './dto/phonebook-query.dto'
import {CustomerPhonebookResponseDto} from './dto/phonebook-response.dto'
import {CustomerPhonebookOptions} from './interfaces/phonebook-options.interface'
import {CustomerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {dtoToCsv} from '~/helpers/csv.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, rowPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerPhonebookService implements CrudService<internal.CustomerPhonebook | internal.VCustomerPhonebook> {
    private readonly log = new LoggerService(CustomerPhonebookService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerPhonebookMariadbRepository) private readonly phonebookRepo: CustomerPhonebookMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
    ) {
    }

    async create(entities: internal.CustomerPhonebook[], sr: ServiceRequest): Promise<internal.CustomerPhonebook[]> {
        await this.checkCustomerAccess(entities, sr)

        const createdIds = await this.phonebookRepo.create(entities, sr)

        const options = {
            filterBy: {
                resellerId: undefined,
            },
        }
        return await this.phonebookRepo.readWhereInIds(createdIds, options, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.CustomerPhonebook[] | internal.VCustomerPhonebook[], number]> {
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
        if (sr.query && sr.query['include']) {
            delete sr.query['include']
        }
        switch (options.view) {
            case CustomerPhonebookView.All:
                return await this.phonebookRepo.readAllFromViewAll(options, sr)
            case CustomerPhonebookView.Shared:
                return await this.phonebookRepo.readAllFromViewShared(options, sr)
            case CustomerPhonebookView.Reseller:
                return await this.phonebookRepo.readAllFromViewReseller(options, sr)
            default:
                if (sr.query && sr.query['own']) {
                    return await this.phonebookRepo.readAllFromViewAll(options, sr)
                }
                return await this.phonebookRepo.readAll(options, sr)
        }
    }

    async read(id: number | string, sr: ServiceRequest): Promise<internal.CustomerPhonebook | internal.VCustomerPhonebook> {
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
        if (sr.query && sr.query['include']) {
            delete sr.query['include']
        }
        switch (options.view) {
            case CustomerPhonebookView.All:
                return await this.phonebookRepo.readByIdFromViewAll(id.toString(), options, sr)
            case CustomerPhonebookView.Shared:
                return await this.phonebookRepo.readByIdFromViewShared(id.toString(), options, sr)
            case CustomerPhonebookView.Reseller:
                return await this.phonebookRepo.readByIdFromViewReseller(id.toString(), options, sr)
            default:
                if (Number.isNaN(+id)) {
                    throw new NotFoundException()
                }
                if (sr.query && sr.query['own']) {
                    return await this.phonebookRepo.readByIdFromViewAll(id.toString(), options, sr)
                }
                return await this.phonebookRepo.readById(+id, options, sr)
        }
    }

    async update(updates: Dictionary<internal.CustomerPhonebook>, sr: ServiceRequest): Promise<number[]> {
        await this.checkCustomerAccess(updates, sr)
        const ids = Object.keys(updates).map(id => parseInt(id))
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
        const existingIds = await this.phonebookRepo.readExistingIds(ids, options)
        throwMissingIds(sr, ids, existingIds, this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.phonebookRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
        const existingIds = await this.phonebookRepo.readExistingIds(ids, options)
        throwMissingIds(sr, ids, existingIds, this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.phonebookRepo.delete(ids,sr)
    }

    getCustomerPhonebookOptionsFromServiceRequest(sr: ServiceRequest): CustomerPhonebookOptions {
        const options: CustomerPhonebookOptions = {
            filterBy: {
                resellerId: undefined,
                customerId: undefined,
            },
        }
        if (sr.params && sr.params['customerId']) {
            options.filterBy.customerId = +sr.params['customerId']

            if (sr.user.role === RbacRole.subscriberadmin && sr.user.customer_id != options.filterBy.customerId) {
                throw new NotFoundException()
            }
        }

        if (sr.user.reseller_id_required) {
            options.filterBy.resellerId = sr.user.reseller_id
        }

        if (sr.user.role === RbacRole.subscriberadmin) {
            options.filterBy.customerId = sr.user.customer_id
        }

        if (sr.query && sr.query.include) {
            options.view = sr.query.include as CustomerPhonebookView
        }

        return options
    }

    async importCsv(entities: internal.CustomerPhonebook[], sr: ServiceRequest): Promise<internal.CustomerPhonebook[]> {
        await this.validateCsvData(entities)
        const _options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
        await this.checkCustomerAccess(entities, sr, (row, entity) => rowPointer(+row, entity, 'contractId'))
        const customers = new Set(entities.map(entity => entity.contractId))
        if (sr.query && sr.query['purge_existing']) {
            if (sr.query['purge_existing'] === 'true') {
                delete sr.query['purge_existing']
                const promises = Array.from(customers).map(async reseller => {
                    await this.phonebookRepo.purge(reseller, sr)
                })
                await Promise.all(promises)
            } else {
                delete sr.query['purge_existing']
            }
        }
        const ids = await this.phonebookRepo.create(entities, sr)
        return await this.phonebookRepo.readWhereInIds(ids, {filterBy: {}}, sr)
    }

    async exportCsv(sr: ServiceRequest): Promise<StreamableFile> {
        const [entities] = await this.readAll(sr)
        const dtos = entities.map(entity => {
            const dto = new CustomerPhonebookResponseDto(entity)
            const {resourceUrl, ...rest} = dto
            return rest
        })

        const csv = await dtoToCsv<CustomerPhonebookResponseDto>(dtos, {
            numericBooleans: this.app.config.csv.export_boolean_format === 'numeric',
        })

        const buffer = Buffer.from(csv, 'utf-8')
        return new StreamableFile(Uint8Array.from(buffer), {
            type: 'text/csv',
            disposition: 'attachment; filename="customer_phonebook.csv"',
        })
    }

    /**
     * Reports every item whose customer is not one of the user's (subscriberadmin: own customer, reseller roles: own
     * reseller's customers)
     * @param pointer pointer of an item's customer_id
     */
    private async checkCustomerAccess(entities: internal.CustomerPhonebook[] | Dictionary<internal.CustomerPhonebook>, sr: ServiceRequest,
        pointer = (key: string, entity: internal.CustomerPhonebook): string => itemPointer(sr, key, entity, 'contractId')): Promise<void> {
        const customerIds = [...new Set(Object.values(entities).map(entity => entity.contractId).filter(id => id != undefined))]
        let allowedIds: number[]
        if (sr.user.role === RbacRole.subscriberadmin)
            allowedIds = [sr.user.customer_id]
        else if (sr.user.reseller_id_required && customerIds.length)
            allowedIds = await this.phonebookRepo.readCustomerIdsOfReseller(customerIds, sr.user.reseller_id)
        else
            return
        const errors = new ApiErrors()
        for (const [key, entity] of Object.entries(entities)) {
            // ids of a csv import are strings
            if (entity.contractId != undefined && !allowedIds.some(id => id == entity.contractId))
                errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), pointer(key, entity))
        }
        errors.throwIfAny()
    }

    private async validateCsvData(entities: internal.CustomerPhonebook[]): Promise<void> {
        const seen = new Set<string>()
        const errors = new ApiErrors()
        entities.forEach((entity, row) => {
            const key = `${entity.contractId}-${entity.number}`
            if (seen.has(key))
                errors.add(this.i18n.t('errors.DUPLICATE_IN_CSV'), rowPointer(row, entity, 'number'))
            seen.add(key)
        })
        errors.throwIfAny()
    }
}
