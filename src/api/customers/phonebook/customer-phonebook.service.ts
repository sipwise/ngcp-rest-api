import {Inject, Injectable, NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerPhonebookView} from './dto/customer-phonebook-query.dto'
import {CustomerPhonebookResponseDto} from './dto/customer-phonebook-response.dto'
import {CustomerPhonebookOptions} from './interfaces/customer-phonebook-options.interface'
import {CustomerPhonebookMariadbRepository} from './repositories/customer-phonebook.mariadb.repository'

import {AppService} from '~/app.service'
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
export class CustomerPhonebookService implements CrudService<internal.CustomerPhonebook | internal.VCustomerPhonebook> {
    private readonly log = new LoggerService(CustomerPhonebookService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerPhonebookMariadbRepository) private readonly phonebookRepo: CustomerPhonebookMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
    ) {
    }

    async create(entities: internal.CustomerPhonebook[], sr: ServiceRequest): Promise<internal.CustomerPhonebook[]> {
        if (sr.user.role === RbacRole.subscriberadmin) {
            if (entities.some(entity => entity.contractId != sr.user.customer_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

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
        const ids = Object.keys(updates).map(id => parseInt(id))
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
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
        const options = this.getCustomerPhonebookOptionsFromServiceRequest(sr)
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
        const tx = await this.app.dbConnection().transaction(async manager => {
            if (sr.user.customer_id_required) {
                if (entities.some(entity => entity.contractId != sr.user.customer_id)) {
                    const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                    throw new UnprocessableEntityException(error.message)
                }
            }
            const customers = new Set(entities.map(entity => entity.contractId))
            if (sr.query && sr.query['purge_existing']) {
                if (sr.query['purge_existing'] === 'true') {
                    delete sr.query['purge_existing']
                    const promises = Array.from(customers).map(async reseller => {
                        await this.phonebookRepo.purge(reseller, sr, manager)
                    })
                    await Promise.all(promises)
                }
                else {
                    delete sr.query['purge_existing']
                }
            }
            return await this.phonebookRepo.create(entities, sr, manager)
        })
        return await this.phonebookRepo.readWhereInIds(tx, {filterBy: {}}, sr)
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

    private async validateCsvData(entities: internal.CustomerPhonebook[]): Promise<void> {
        const seen = new Set<string>()
        for (const dto of entities) {
            const key = `${dto.contractId}-${dto.number}`
            if (seen.has(key)) {
                const error: ErrorMessage = this.i18n.t('errors.DUPLICATE_IN_CSV')
                throw new UnprocessableEntityException(error.message)
            }
            seen.add(key)
        }
    }
}
