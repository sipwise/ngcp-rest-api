import {
    ForbiddenException,
    Inject,
    Injectable,
    InternalServerErrorException,
    StreamableFile,
    UnprocessableEntityException,
} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {
    checkInvoiceTemplateDirectives,
    invoiceTemplateMimeType,
    isSvgContent,
    readDefaultInvoiceTemplate,
    sanitizeSvg,
} from './invoice-template.helper'
import {convertLegacyInvoiceTemplate} from './invoice-template.legacy'
import {
    InvoiceTemplatePdfError,
    InvoiceTemplateRenderError,
    renderInvoiceTemplate,
    svgToPdf,
    toTemplateVars,
} from './invoice-template.renderer'
import {InvoiceTemplateVars, getInvoiceTemplateVars} from './invoice-template.vars'
import {FilterBy, InvoiceTemplateMariadbRepository} from './repositories/invoice.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException,apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const readOnlyRoles: string[] = [RbacRole.ccare, RbacRole.ccareadmin]
const resellerRequiredCategories: InvoiceTemplateCategory[] = [InvoiceTemplateCategory.Customer, InvoiceTemplateCategory.Did]

@Injectable()
export class InvoiceTemplateService implements CrudService<internal.InvoiceTemplate> {
    private readonly log = new LoggerService(InvoiceTemplateService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(InvoiceTemplateMariadbRepository) private readonly invoiceTemplateRepo: InvoiceTemplateMariadbRepository,
    ) {
    }

    async create(entities: internal.InvoiceTemplate[], sr: ServiceRequest, file?: Express.Multer.File): Promise<internal.InvoiceTemplate[]> {
        this.checkWriteAccess(sr)
        if (entities.length == 0) {
            return []
        }
        const entity = entities[0]
        await this.checkTemplate(entity, sr, 0)
        entity.data = await this.newContent(entity.category, file)

        const createdIds = await this.invoiceTemplateRepo.create([entity])
        return await this.invoiceTemplateRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.InvoiceTemplate[], number]> {
        return await this.invoiceTemplateRepo.readAll(sr, this.getFilterBy(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.InvoiceTemplate> {
        return await this.invoiceTemplateRepo.readById(id, sr, this.getFilterBy(sr))
    }

    async readVars(id: number, sr: ServiceRequest): Promise<InvoiceTemplateVars> {
        const template = await this.read(id, sr)
        return getInvoiceTemplateVars(template.category, template.callDirection, sr.user.role)
    }

    async readFile(id: number, sr: ServiceRequest): Promise<StreamableFile> {
        const template = await this.read(id, sr)
        const content = await this.readContent(template)
        return this.toFile(content, `${invoiceTemplateMimeType}; charset=utf-8`, 'attachment', `${template.name}.svg`)
    }

    async renderPreview(id: number, sr: ServiceRequest): Promise<StreamableFile> {
        const template = await this.read(id, sr)
        const vars = getInvoiceTemplateVars(template.category, template.callDirection, sr.user.role)
        const pdf = await this.render(template, vars)
        return this.toFile(pdf, 'application/pdf', 'inline', `${template.name}.pdf`)
    }

    /**
     * Renders the template with the given variables to a pdf
     */
    async render(template: internal.InvoiceTemplate, vars: InvoiceTemplateVars): Promise<Buffer> {
        const content = await this.readContent(template)
        try {
            const svg = renderInvoiceTemplate(content.toString('utf8'), toTemplateVars(vars), template.category)
            return await svgToPdf(svg)
        } catch (err) {
            if (err instanceof InvoiceTemplateRenderError) {
                throw new UnprocessableEntityException(this.i18n.t('errors.INVOICE_TEMPLATE_RENDER_FAILED', {
                    args: {category: template.category, reason: err.message},
                }))
            }
            if (err instanceof InvoiceTemplatePdfError) {
                this.log.error({message: 'failed to convert invoice template to pdf', id: template.id, err: err})
                throw new InternalServerErrorException(this.i18n.t('errors.INVOICE_TEMPLATE_CONVERTER_FAILED', {
                    args: {reason: err.message},
                }))
            }
            throw err
        }
    }

    async update(
        updates: Dictionary<internal.InvoiceTemplate>,
        sr: ServiceRequest,
        file?: Express.Multer.File,
        replace = false,
    ): Promise<number[]> {
        this.checkWriteAccess(sr)
        const ids = Object.keys(updates).map(id => parseInt(id))
        const templates = await this.readWhereInIds(ids, sr)

        for (const template of templates) {
            const update = updates[template.id]
            update.id = template.id
            if (update.category != template.category)
                throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_CATEGORY_IMMUTABLE'), itemPointer(sr, template.id, update, 'category'))
            await this.checkTemplate(update, sr, template.id)
            if (file || replace) {
                update.data = await this.newContent(update.category, file)
            } else {
                update.data = template.data
            }
        }

        return await this.invoiceTemplateRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.checkWriteAccess(sr)
        await this.readWhereInIds(ids, sr)
        return await this.invoiceTemplateRepo.delete(ids, sr)
    }

    private async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.InvoiceTemplate[]> {
        const templates = await this.invoiceTemplateRepo.readWhereInIds(ids, sr, this.getFilterBy(sr))
        throwMissingIds(sr, ids, templates.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        return templates
    }

    private getFilterBy(sr: ServiceRequest): FilterBy | undefined {
        return sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : undefined
    }

    private checkWriteAccess(sr: ServiceRequest): void {
        if (readOnlyRoles.includes(sr.user.role)) {
            throw new ForbiddenException(this.i18n.t('errors.INVOICE_TEMPLATE_READ_ONLY'))
        }
    }

    private async checkTemplate(entity: internal.InvoiceTemplate, sr: ServiceRequest, key: number | string): Promise<void> {
        if (sr.user.reseller_id_required) {
            entity.resellerId = sr.user.reseller_id
        } else if (resellerRequiredCategories.includes(entity.category)) {
            if (!entity.resellerId) {
                throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_RESELLER_REQUIRED', {
                    args: {category: entity.category},
                }), itemPointer(sr, key, entity, 'resellerId'))
            }
        } else if (entity.resellerId) {
            throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_RESELLER_NOT_ALLOWED', {
                args: {category: entity.category},
            }), itemPointer(sr, key, entity, 'resellerId'))
        }

        const existing = await this.invoiceTemplateRepo.readByResellerAndName(entity.resellerId, entity.name)
        if (existing && existing.id != entity.id) {
            throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_NAME_EXISTS', {
                args: {name: entity.name, reseller_id: entity.resellerId ?? 'none'},
            }), itemPointer(sr, key, entity, 'name'))
        }
    }

    private async newContent(category: InvoiceTemplateCategory, file?: Express.Multer.File): Promise<Buffer> {
        if (!file)
            return await this.getDefaultContent(category)

        const content = file.buffer?.toString('utf8') ?? ''
        if (!isSvgContent(content))
            throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_INVALID_CONTENT'), '/file')
        const sanitized = sanitizeSvg(content)
        this.checkDirectives(sanitized, category)
        return Buffer.from(sanitized, 'utf8')
    }

    private checkDirectives(content: string, category: InvoiceTemplateCategory): void {
        const problems = checkInvoiceTemplateDirectives(content, category)
        if (problems.length) {
            const error: ErrorMessage = this.i18n.t('errors.INVOICE_TEMPLATE_INVALID_DIRECTIVES', {
                args: {category: category},
            })
            // the uploaded template is the multipart field `file`
            throw new ApiErrorException(problems.map(problem => ({pointer: '/file', code: error.errorCode, message: `${error.message}: ${problem}`})))
        }
    }

    private toFile(content: Buffer, type: string, disposition: 'attachment' | 'inline', filename: string): StreamableFile {
        return new StreamableFile(content, {
            type: type,
            disposition: `${disposition}; filename="${filename.replace(/["\\\r\n]/g, '_')}"`,
            length: content.length,
        })
    }

    // templates stored in the old format are converted to the current format
    private async readContent(template: internal.InvoiceTemplate): Promise<Buffer> {
        if (!template.data?.length)
            return await this.getDefaultContent(template.category)
        const content = template.data.toString('utf8')
        const converted = convertLegacyInvoiceTemplate(content)
        return converted === content ? template.data : Buffer.from(converted, 'utf8')
    }

    private async getDefaultContent(category: InvoiceTemplateCategory): Promise<Buffer> {
        try {
            return await readDefaultInvoiceTemplate(category)
        } catch (err) {
            this.log.error({message: 'failed to load default invoice template', category: category, err: err})
            throw new UnprocessableEntityException(this.i18n.t('errors.INVOICE_TEMPLATE_DEFAULT_NOT_FOUND', {
                args: {category: category},
            }))
        }
    }
}
