import {Inject, Injectable, NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {SubscriberPhonebookView} from './dto/subscriber-phonebook-query.dto'
import {SubscriberPhonebookResponseDto} from './dto/subscriber-phonebook-response.dto'
import {SubscriberPhonebookOptions} from './interfaces/subscriber-phonebook-options.interface'
import {SubscriberPhonebookMariadbRepository} from './repositories/subscriber-phonebook.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {dtoToCsv} from '~/helpers/csv.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class SubscriberPhonebookService implements CrudService<internal.SubscriberPhonebook | internal.VSubscriberPhonebook> {
    private readonly log = new LoggerService(SubscriberPhonebookService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(SubscriberPhonebookMariadbRepository) private readonly phonebookRepo: SubscriberPhonebookMariadbRepository,
    ) {
    }

    async create(entities: internal.SubscriberPhonebook[], sr: ServiceRequest): Promise<internal.SubscriberPhonebook[]> {
        if (sr.user.role === RbacRole.subscriberadmin || sr.user.role === RbacRole.subscriber) {
            if (entities.some(entity => entity.subscriberId != sr.user.subscriber_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        const createdIds = await this.phonebookRepo.create(entities)

        const options = {
            filterBy: {
                resellerId: undefined,
            },
        }
        return await this.phonebookRepo.readWhereInIds(createdIds, options, sr)
    }

    async import(entities: internal.SubscriberPhonebook[], sr: ServiceRequest): Promise<internal.SubscriberPhonebook[]> {
        if (sr.user.role === RbacRole.subscriberadmin || sr.user.role === RbacRole.subscriber) {
            if (entities.some(entity => entity.subscriberId != sr.user.subscriber_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        if (sr.query && sr.query['purge_existing']) {
            if (sr.query['purge_existing'] === 'true') {
                delete sr.query['purge_existing']
                const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
                const numbers = new Set(entities.map(entity => entity.number))
                const ids = await this.phonebookRepo.readWhereInNumbers(Array.from(numbers), options, sr)
                if (ids.length > 0)
                    await this.delete(ids, sr)
            }
            else {
                delete sr.query['purge_existing']
            }
        }

        const createdIds = await this.phonebookRepo.create(entities)

        const options = {
            filterBy: {
                resellerId: undefined,
            },
        }
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
                return await this.phonebookRepo.readAllFromViewShared(options, sr)
            case SubscriberPhonebookView.Reseller:
                return await this.phonebookRepo.readAllFromViewReseller(options, sr)
            default:
                return await this.phonebookRepo.readAll(options, sr)
        }
    }

    async export(sr: ServiceRequest): Promise<StreamableFile> {
        const [entities] = await this.readAll(sr)
        const dtos = entities.map(entity => {
            const dto = new SubscriberPhonebookResponseDto(entity)
            const {resourceUrl, ...rest} = dto
            return rest
        })

        const csv = await dtoToCsv<SubscriberPhonebookResponseDto>(dtos)

        const buffer = Buffer.from(csv, 'utf-8')
        return new StreamableFile(Uint8Array.from(buffer), {
            type: 'text/csv',
            disposition: 'attachment; filename="customer_phonebook.csv"',
        })
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
                return await this.phonebookRepo.readById(+id, options, sr)
        }
    }

    async update(updates: Dictionary<internal.SubscriberPhonebook>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        const phonebookCount = await this.phonebookRepo.readCountOfIds(ids, options, sr)

        if (phonebookCount == 0) {
            throw new NotFoundException()
        } else if (ids.length != phonebookCount) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.phonebookRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const options = this.getSubscriberPhonebookOptionsFromServiceRequest(sr)
        const phonebookCount = await this.phonebookRepo.readCountOfIds(ids, options, sr)

        if (phonebookCount == 0) {
            throw new NotFoundException()
        } else if (ids.length != phonebookCount) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.phonebookRepo.delete(ids,sr)
    }

    getSubscriberPhonebookOptionsFromServiceRequest(sr: ServiceRequest): SubscriberPhonebookOptions {
        const options: SubscriberPhonebookOptions = {
            filterBy: {
                subscriber_id: undefined,
                resellerId: undefined,
                customerId: undefined,
            },
        }
        if (sr.params && sr.params['subscriberId']) {
            options.filterBy.subscriber_id = +sr.params['subscriberId']

            if (
                (sr.user.role === RbacRole.subscriberadmin || sr.user.role === RbacRole.subscriber)
                && sr.user.id != options.filterBy.subscriber_id
            ) {
                throw new NotFoundException()
            }
        }

        if (sr.user.reseller_id_required) {
            options.filterBy.resellerId = sr.user.reseller_id
        }

        if (sr.user.role === RbacRole.subscriberadmin || sr.user.role === RbacRole.subscriber) {
            options.filterBy.subscriber_id = sr.user.id
        }

        if (sr.query && sr.query.include) {
            options.view = sr.query.include as SubscriberPhonebookView
        }

        return options
    }
}
