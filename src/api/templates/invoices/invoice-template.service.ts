import {Inject, Injectable, NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, InvoiceTemplateMariadbRepository} from './repositories/invoice-template.mariadb.repository'

import {internal} from '~/entities'
import {InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class InvoiceTemplateService implements CrudService<internal.InvoiceTemplate> {
    private readonly log = new LoggerService(InvoiceTemplateService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(InvoiceTemplateMariadbRepository) private readonly invoiceTemplateRepo: InvoiceTemplateMariadbRepository,
    ) {
    }

    async create(entities: internal.InvoiceTemplate[], sr: ServiceRequest, file: Express.Multer.File): Promise<internal.InvoiceTemplate[]> {
        if (!file) {
            throw new UnprocessableEntityException()
        }
        if (entities.length == 0) {
            return []
        }
        const entity = entities[0]
        entity.data = file.buffer
        this.checkResellerAccess(entity, sr)
        const createdIds = await this.invoiceTemplateRepo.create([entity])
        return await this.invoiceTemplateRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.InvoiceTemplate[], number]> {
        const filters = this.getFiltersFromServiceRequest(sr)
        return await this.invoiceTemplateRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.InvoiceTemplate> {
        const filters = this.getFiltersFromServiceRequest(sr)
        return await this.invoiceTemplateRepo.readById(id, sr, filters)
    }

    async readFile(id: number, sr: ServiceRequest): Promise<StreamableFile> {
        const template = await this.read(id, sr)
        if (!template) {
            throw new NotFoundException()
        }
        const stream = new StreamableFile(template.data, {
            type: template.type === InvoiceTemplateType.SVG ? 'image/svg+xml' : 'text/html',
            disposition: `attachment; filename="${template.name}.${template.type}"; size=${template.data.length}`,
        })

        return stream
    }

    async update(updates: Dictionary<internal.InvoiceTemplate>, sr: ServiceRequest, file?: Express.Multer.File): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const template  = await this.invoiceTemplateRepo.readById(ids[0], sr)
        if (!template) {
            throw new NotFoundException()
        }
        if (file) {
            updates[ids[0]].data = file.buffer
        }
        return await this.invoiceTemplateRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const filters = this.getFiltersFromServiceRequest(sr)
        const templates = await this.invoiceTemplateRepo.readWhereInIds(ids, sr, filters)

        if (templates.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != templates.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.invoiceTemplateRepo.delete(ids, sr)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id
        if (sr.user.customer_id_required)
            filters.customerId = sr.user.customer_id
        return filters
    }

    private checkResellerAccess(entity: internal.InvoiceTemplate, sr: ServiceRequest): boolean {
        if (!sr.user.reseller_id_required) return true
        if (entity.resellerId != sr.user.reseller_id) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(Array.from([entity.id]), error.message)
            throw new UnprocessableEntityException(message)
        }
        return true
    }
}
