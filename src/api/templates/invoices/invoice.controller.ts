import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    Response,
    StreamableFile,
    UnprocessableEntityException,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiProduces, ApiTags} from '@nestjs/swagger'
import {plainToInstance} from 'class-transformer'
import {Request, Response as ExpressResponse} from 'express'

import {InvoiceTemplateRequestDto} from './dto/invoice-request.dto'
import {InvoiceTemplateResponseDto} from './dto/invoice-response.dto'
import {InvoiceTemplateSearchDto} from './dto/invoice-search.dto'
import {InvoiceTemplateVarsResponseDto} from './dto/invoice-vars-response.dto'
import {invoiceTemplateMimeType} from './invoice-template.helper'
import {InvoiceTemplateService} from './invoice.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'templates/invoices'

const uploadInterceptor = FileInterceptor('file', {
    limits: {
        fileSize: AppService.config.fileshare.limits.upload_size || null,
    },
})

const multipartPatchFields = ['name', 'reseller_id', 'type', 'call_direction', 'category']

@ApiTags('Template')
@Controller(resourceName)
@License(LicenseType.invoice)
@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
)
export class InvoiceTemplateController extends CrudController<InvoiceTemplateRequestDto, InvoiceTemplateResponseDto> {
    private readonly log = new LoggerService(InvoiceTemplateController.name)

    constructor(
        private readonly invoiceTemplateService: InvoiceTemplateService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, invoiceTemplateService, journalService)
    }

    @Post()
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiBody({
        description: 'application/json without `file` stores the default template of the category, multipart/form-data with the svg `file` stores the uploaded template',
        type: InvoiceTemplateRequestDto,
        encoding: {
            file: {contentType: 'image/svg+xml'},
        },
    })
    @ApiCreatedResponse(InvoiceTemplateResponseDto)
    @UseInterceptors(uploadInterceptor)
    @Transactional()
    async createWithFile(
        @Body() createDto: InvoiceTemplateRequestDto,
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<InvoiceTemplateResponseDto[]> {
        this.log.debug({message: 'create invoice template', func: this.createWithFile.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const created = await this.invoiceTemplateService.create([createDto.toInternal()], sr, file)
        const response = created.map((e) => new InvoiceTemplateResponseDto(e, {url: req.url}))
        await this.journalService.writeJournal(sr, 0, response)
        return response
    }

    @Get()
    @ApiSearchQuery(SearchLogic, InvoiceTemplateSearchDto)
    @ApiPaginatedResponse(InvoiceTemplateResponseDto)
    async readAll(@Req() req: Request): Promise<[InvoiceTemplateResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all invoice templates',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })
        const sr = new ServiceRequest(req)
        const searchDtoKeys = Object.keys(new InvoiceTemplateSearchDto())
        const [response, totalCount] =
            await this.invoiceTemplateService.readAll(sr)
        const responseList = response.map((e) => new InvoiceTemplateResponseDto(e, {url: req.url}))
        if (sr.query.expand) {
            await this.expander.expandObjects(responseList, searchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id/@vars')
    @ApiOkResponse({
        description: 'All variables and functions supported by the category of the invoice template, with example values',
        type: InvoiceTemplateVarsResponseDto,
    })
    async readVars(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<InvoiceTemplateVarsResponseDto> {
        this.log.debug({
            message: 'fetch invoice template variables by id',
            func: this.readVars.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const vars = await this.invoiceTemplateService.readVars(id, sr)
        const url = req.url.split('?')[0].replace(/\/@vars\/?$/, '')
        return new InvoiceTemplateVarsResponseDto(vars, {url: url, containsResourceId: true})
    }

    @Get(':id')
    @ApiProduces('application/json', invoiceTemplateMimeType)
    @ApiOkResponse({
        description: `Invoice template, or the svg template content as is when requested with \`Accept: ${invoiceTemplateMimeType}\``,
        type: InvoiceTemplateResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Response({passthrough: true}) res: ExpressResponse,
    ): Promise<InvoiceTemplateResponseDto | StreamableFile> {
        this.log.debug({
            message: 'fetch invoice template by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        res.vary('Accept')
        if (req.accepts(['application/json', invoiceTemplateMimeType]) == invoiceTemplateMimeType) {
            // the file is sent as is, it must not be transformed to json (see TransformInterceptor)
            res['passthrough'] = true
            return await this.invoiceTemplateService.readFile(id, sr)
        }
        const template = await this.invoiceTemplateService.read(id, sr)
        const responseItem = new InvoiceTemplateResponseDto(template, {url: req.url, containsResourceId: true})
        if (sr.query.expand && !sr.isInternalRedirect) {
            const templateSearchDtoKeys = Object.keys(new InvoiceTemplateSearchDto())
            await this.expander.expandObjects([responseItem], templateSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Get(':id/@preview')
    @ApiProduces('application/pdf')
    @ApiOkResponse({
        description: 'Pdf preview of the invoice template, rendered with example values of its category',
        type: StreamableFile,
    })
    async preview(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Response({passthrough: true}) res: ExpressResponse,
    ): Promise<StreamableFile> {
        this.log.debug({message: 'render invoice template preview by id', func: this.preview.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        // the file is sent as is, it must not be transformed to json (see TransformInterceptor)
        res['passthrough'] = true
        return await this.invoiceTemplateService.renderPreview(id, sr)
    }

    @Put(':id')
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiBody({
        description: 'application/json without `file` stores the default template of the category, multipart/form-data with the svg `file` stores the uploaded template',
        type: InvoiceTemplateRequestDto,
        encoding: {
            file: {contentType: 'image/svg+xml'},
        },
    })
    @ApiOkResponse({type: InvoiceTemplateResponseDto})
    @UseInterceptors(uploadInterceptor)
    @Transactional()
    async updateWithFile(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: InvoiceTemplateRequestDto,
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<InvoiceTemplateResponseDto> {
        this.log.debug({
            message: 'update invoice template by id',
            id: id,
            func: this.updateWithFile.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.InvoiceTemplate>()
        updates[id] = Object.assign(new InvoiceTemplateRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.invoiceTemplateService.update(updates, sr, file, true)
        const entity = await this.invoiceTemplateService.read(ids[0], sr)
        const response = new InvoiceTemplateResponseDto(entity, {url: req.url, containsResourceId: true})
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json', 'multipart/form-data')
    @ApiBody({
        description: 'JSON patch of the template fields, or multipart/form-data with the svg `file` and optional fields to update',
        type: [PatchDto],
    })
    @ApiOkResponse({type: InvoiceTemplateResponseDto})
    @UseInterceptors(uploadInterceptor)
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<InvoiceTemplateResponseDto> {
        this.log.debug({
            message: 'patch invoice template by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const patch = req.is('multipart/form-data')
            ? this.multipartToPatch(body, file)
            : await new ParsePatchPipe().transform(body, {type: 'body'})
        const oldEntity = await this.invoiceTemplateService.read(id, sr)
        const entity = patch.length
            ? await patchToEntity<internal.InvoiceTemplate, InvoiceTemplateRequestDto>(oldEntity, patch, InvoiceTemplateRequestDto)
            : oldEntity
        const updates = new Dictionary<internal.InvoiceTemplate>()
        updates[id] = entity
        const ids = await this.invoiceTemplateService.update(updates, sr, file)
        const updatedEntity = await this.invoiceTemplateService.read(ids[0], sr)
        const response = new InvoiceTemplateResponseDto(updatedEntity, {url: req.url, containsResourceId: true})
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete('{:id}')
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete invoice templates by ids',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.invoiceTemplateService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(
        @Param('id') id: number | string,
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch invoice template journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

    private multipartToPatch(body: unknown, file?: Express.Multer.File): PatchOperation[] {
        const fields = (body && typeof body == 'object' ? body : {}) as Record<string, unknown>
        if (!file && !Object.keys(fields).length) {
            throw new UnprocessableEntityException()
        }
        const unknownFields = Object.keys(fields).filter(key => !multipartPatchFields.includes(key))
        if (unknownFields.length) {
            throw new UnprocessableEntityException(unknownFields.map(key => `property ${key} should not exist`))
        }
        const dto = plainToInstance(InvoiceTemplateRequestDto, fields) as unknown as Record<string, unknown>
        const patch = Object.keys(fields).map(key => ({
            op: 'replace',
            path: `/${key}`,
            value: dto[key],
        }) as PatchOperation)
        return patch
    }
}
