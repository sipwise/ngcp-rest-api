import {Inject, Injectable, NotFoundException, StreamableFile} from '@nestjs/common'
import * as asyncLib from 'async'
import {I18nService} from 'nestjs-i18n'

import {SubscriberPhonebookView} from './dto/phonebook-query.dto'
import {SubscriberPhonebookResponseDto} from './dto/phonebook-response.dto'
import {SubscriberPhonebookOptions} from './interfaces/phonebook-options.interface'
import {SubscriberPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

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
export class SubscriberPhonebookService implements CrudService<internal.SubscriberPhonebook | internal.VSubscriberPhonebook> {
    private readonly log = new LoggerService(SubscriberPhonebookService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(SubscriberPhonebookMariadbRepository) private readonly phonebookRepo: SubscriberPhonebookMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
    ) {
    }

    async create(entities: internal.SubscriberPhonebook[], sr: ServiceRequest): Promise<internal.SubscriberPhonebook[]> {
        const subscriberIds: {[id: number]: number} = {}

        await asyncLib.forEach(entities, async entity => {
            if (sr.user.role == 'subscriberadmin' || sr.user.role == 'subscriber') {
                entity.subscriberId = entity.subscriberId || sr.user.id
            }
            subscriberIds[entity.subscriberId] = entity.subscriberId
        })

        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        await this.checkAllowedSubscribers(entities, sr)
        const createdIds = await this.phonebookRepo.create(entities, sr)

        return await this.phonebookRepo.readWhereInIds(createdIds, options, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.SubscriberPhonebook[] | internal.VSubscriberPhonebook[], number]> {
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        if (sr.query && sr.query['include']) {
            delete sr.query['include']
        }
        switch (options.view) {
            case SubscriberPhonebookView.All:
                return await this.phonebookRepo.readAllFromViewAll(options, sr)
            case SubscriberPhonebookView.Customer:
                return await this.phonebookRepo.readAllFromViewContract(options, sr)
            case SubscriberPhonebookView.Reseller:
                return await this.phonebookRepo.readAllFromViewReseller(options, sr)
            default:
                if (sr.query && sr.query['own']) {
                    return await this.phonebookRepo.readAllFromViewAll(options, sr)
                }
                return await this.phonebookRepo.readAll(options, sr)
        }
    }

    async read(id: number | string, sr: ServiceRequest): Promise<internal.SubscriberPhonebook | internal.VSubscriberPhonebook> {
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        if (sr.query && sr.query['include']) {
            delete sr.query['include']
        }
        switch (options.view) {
            case SubscriberPhonebookView.All:
                return await this.phonebookRepo.readByIdFromViewAll(id.toString(), options, sr)
            case SubscriberPhonebookView.Customer:
                return await this.phonebookRepo.readByIdFromViewContract(id.toString(), options, sr)
            case SubscriberPhonebookView.Reseller:
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

    async update(updates: Dictionary<internal.SubscriberPhonebook>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        const existingIds = await this.phonebookRepo.readExistingIds(ids, options)
        throwMissingIds(sr, ids, existingIds, this.i18n.t('errors.ENTRY_NOT_FOUND'))
        await this.checkAllowedSubscribers(updates, sr)

        return await this.phonebookRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        const existingIds = await this.phonebookRepo.readExistingIds(ids, options)
        throwMissingIds(sr, ids, existingIds, this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.phonebookRepo.delete(ids,sr)
    }

    getSubscriberPhonebookOptionsFromServiceRequest(sr: ServiceRequest): SubscriberPhonebookOptions {
        const options: SubscriberPhonebookOptions = {
            filterBy: {
                subscriberId: undefined,
                resellerId: undefined,
                customerId: undefined,
            },
        }
        if (sr.params && sr.params['subscriberId']) {
            options.filterBy.subscriberId = +sr.params['subscriberId']

            if (sr.user.role === RbacRole.subscriber && sr.user.id != options.filterBy.subscriberId) {
                throw new NotFoundException()
            }
        }

        if (sr.user.reseller_id_required) {
            options.filterBy.resellerId = sr.user.reseller_id
        }

        if (sr.user.role === RbacRole.subscriber) {
            options.filterBy.subscriberId = sr.user.id
        }

        if (sr.user.role === RbacRole.subscriberadmin) {
            options.filterBy.customerId = sr.user.customer_id
        }

        if (sr.query && sr.query.include) {
            options.view = sr.query.include as SubscriberPhonebookView
        }

        return options
    }

    async importCsv(entities: internal.SubscriberPhonebook[], sr: ServiceRequest): Promise<internal.SubscriberPhonebook[]> {
        await this.validateCsvData(entities)
        const _options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)

        await this.checkAllowedSubscribers(entities, sr, (row, entity) => rowPointer(+row, entity, 'subscriberId'))
        const subscribers = new Set(entities.map(entity => entity.subscriberId))
        if (sr.query && sr.query['purge_existing']) {
            if (sr.query['purge_existing'] === 'true') {
                delete sr.query['purge_existing']
                const promises = Array.from(subscribers).map(async subscriber => {
                    await this.phonebookRepo.purge(subscriber, sr)
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
            const dto = new SubscriberPhonebookResponseDto(entity)
            const {resourceUrl, ...rest} = dto
            return rest
        })

        const csv = await dtoToCsv<SubscriberPhonebookResponseDto>(dtos, {
            numericBooleans: this.app.config.csv.export_boolean_format === 'numeric',
        })

        const buffer = Buffer.from(csv, 'utf-8')
        return new StreamableFile(Uint8Array.from(buffer), {
            type: 'text/csv',
            disposition: 'attachment; filename="subscriber_phonebook.csv"',
        })
    }

    /**
     * Reports every item whose subscriber is not visible to the user
     * @param pointer pointer of an item's subscriber_id
     */
    private async checkAllowedSubscribers(entities: internal.SubscriberPhonebook[] | Dictionary<internal.SubscriberPhonebook>, sr: ServiceRequest,
        pointer = (key: string, entity: internal.SubscriberPhonebook): string => itemPointer(sr, key, entity, 'subscriberId')): Promise<void> {
        const ids = [...new Set(Object.values(entities).map(entity => entity.subscriberId).filter(id => id != undefined))].sort((a, b) => a - b)
        if (!ids.length)
            return
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        const allowedIds = await this.phonebookRepo.getAllowedSubscriberIds(ids, options.filterBy, sr)
        const errors = new ApiErrors()
        for (const [key, entity] of Object.entries(entities)) {
            // ids of a csv import are strings
            if (entity.subscriberId != undefined && !allowedIds.some(id => id == entity.subscriberId))
                errors.add(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'), pointer(key, entity))
        }
        errors.throwIfAny()
    }

    private async validateCsvData(entities: internal.SubscriberPhonebook[]): Promise<void> {
        const seen = new Set<string>()
        const errors = new ApiErrors()
        entities.forEach((entity, row) => {
            const key = `${entity.subscriberId}-${entity.number}`
            if (seen.has(key))
                errors.add(this.i18n.t('errors.DUPLICATE_IN_CSV'), rowPointer(row, entity, 'number'))
            seen.add(key)
        })
        errors.throwIfAny()
    }
}
