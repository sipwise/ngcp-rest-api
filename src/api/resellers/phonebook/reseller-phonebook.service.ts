import {Inject, Injectable, NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ResellerPhonebookResponseDto} from './dto/reseller-phonebook-response.dto'
import {ResellerPhonebookOptions} from './interfaces/reseller-phonebook-options.interface'
import {ResellerPhonebookMariadbRepository} from './repositories/reseller-phonebook.mariadb.repository'

import {internal} from '~/entities'
import {dtoToCsv} from '~/helpers/csv.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ResellerPhonebookService implements CrudService<internal.ResellerPhonebook> {
    private readonly log = new LoggerService(ResellerPhonebookService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ResellerPhonebookMariadbRepository) private readonly phonebookRepo: ResellerPhonebookMariadbRepository,
    ) {
    }

    async create(entities: internal.ResellerPhonebook[], sr: ServiceRequest): Promise<internal.ResellerPhonebook[]> {
        if (sr.user.reseller_id_required) {
            if (entities.some(entity => entity.resellerId != sr.user.reseller_id)) {
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

    async import(entities: internal.ResellerPhonebook[], sr: ServiceRequest): Promise<internal.ResellerPhonebook[]> {
        if (sr.user.reseller_id_required) {
            if (entities.some(entity => entity.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        if (sr.query && sr.query['purge_existing']) {
            if (sr.query['purge_existing'] === 'true') {
                delete sr.query['purge_existing']
                const options = this.getResellerPhonebookOptionsFromServiceRequest(sr)
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

    async readAll(sr: ServiceRequest): Promise<[internal.ResellerPhonebook[], number]> {
        const options = this.getResellerPhonebookOptionsFromServiceRequest(sr)
        return await this.phonebookRepo.readAll(options, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.ResellerPhonebook> {
        const options = this.getResellerPhonebookOptionsFromServiceRequest(sr)
        return await this.phonebookRepo.readById(id, options, sr)
    }

    async update(updates: Dictionary<internal.ResellerPhonebook>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const options = this.getResellerPhonebookOptionsFromServiceRequest(sr)
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
        const options = this.getResellerPhonebookOptionsFromServiceRequest(sr)
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

    getResellerPhonebookOptionsFromServiceRequest(sr: ServiceRequest): ResellerPhonebookOptions {
        const options:ResellerPhonebookOptions = {
            filterBy: {
                resellerId: undefined,
                customerId: undefined,
            },
        }
        if (sr.params && sr.params['resellerId']) {
            options.filterBy.resellerId = +sr.params['resellerId']

            if (sr.user.reseller_id_required && sr.user.reseller_id != options.filterBy.resellerId) {
                throw new NotFoundException()
            }
        }

        if (sr.user.reseller_id_required) {
            options.filterBy.resellerId = sr.user.reseller_id
        }

        return options
    }

    async export(sr: ServiceRequest): Promise<StreamableFile> {
        const [entities] = await this.readAll(sr)
        const dtos = entities.map(entity => {
            const dto = new ResellerPhonebookResponseDto(entity)
            const {resourceUrl, ...rest} = dto
            return rest
        })

        const csv = await dtoToCsv<ResellerPhonebookResponseDto>(dtos)

        const buffer = Buffer.from(csv, 'utf-8')
        return new StreamableFile(Uint8Array.from(buffer), {
            type: 'text/csv',
            disposition: 'attachment; filename="reseller_phonebook.csv"',
        })
    }
}
