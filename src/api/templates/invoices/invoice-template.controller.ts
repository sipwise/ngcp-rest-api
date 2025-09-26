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
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {InvoiceTemplateRequestDto} from './dto/invoice-template-request.dto'
import {InvoiceTemplateResponseDto} from './dto/invoice-template-response.dto'
import {InvoiceTemplateSearchDto} from './dto/invoice-template-search.dto'
import {InvoiceTemplateService} from './invoice-template.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {patchToEntity} from '~/helpers/patch.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'templates/invoices'

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
    @ApiConsumes('multipart/form-data')
    @ApiCreatedResponse(InvoiceTemplateResponseDto)
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null,
        },
    }))
    @Transactional()
    async createWithFile(
        @Body() createDto: InvoiceTemplateRequestDto,
        @Req() req: Request,
        @UploadedFile() file,
    ): Promise<InvoiceTemplateResponseDto[]> {
        this.log.debug({message: 'create invoice template', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const created = await this.invoiceTemplateService.create([createDto.toInternal()], sr, file)
        await this.journalService.writeJournal(sr, 0, created)
        return created.map((e) => new InvoiceTemplateResponseDto(e, {url: req.url}))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
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

    @Get(':id')
    @ApiOkResponse({
        type: InvoiceTemplateResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<InvoiceTemplateResponseDto> {
        this.log.debug({
            message: 'fetch invoice template by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const template = await this.invoiceTemplateService.read(id, sr)
        const responseItem = new InvoiceTemplateResponseDto(template, {url: req.url, containsResourceId: true})
        if (sr.query.expand && !sr.isInternalRedirect) {
            const templateSearchDtoKeys = Object.keys(new InvoiceTemplateSearchDto())
            await this.expander.expandObjects([responseItem], templateSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Get(':id/@data')
    @ApiOkResponse({
        type: StreamableFile,
    })
    async readFile(
        @Param('id') id: number,
        @Req() req: Request,
        @Response({passthrough: true}) res,
    ): Promise<StreamableFile> {
        this.log.debug({message: 'fetch invoice template file by template id', func: this.readFile.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const stream = await this.invoiceTemplateService.readFile(id, sr)
        let size = 0
        stream.options.disposition.split(/;\s*/).map(pair => {
            const p = pair.split('=')
            if (p[0] && p[0] == 'size' && p[1])
                size = Number(p[1])
        })

        res.set({
            ...(size > 0 && {'Content-Length': size}),
            'Content-Type': stream.options.type,
            'Content-Disposition': stream.options.disposition,
        })
        res.passthrough = true

        return stream
    }

    @Put(':id')
    @ApiConsumes('multipart/form-data')
    @ApiOkResponse({type: InvoiceTemplateResponseDto})
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null,
        },
    }))
    @Transactional()
    async updateWithFile(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: InvoiceTemplateRequestDto,
        @Req() req: Request,
        @UploadedFile() file,
    ): Promise<InvoiceTemplateResponseDto> {
        this.log.debug({
            message: 'update invoice template by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.InvoiceTemplate>()
        updates[id] = Object.assign(new InvoiceTemplateRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.invoiceTemplateService.update(updates, sr, file)
        const entity = await this.invoiceTemplateService.read(ids[0], sr)
        const response = new InvoiceTemplateResponseDto(entity, {url: req.url, containsResourceId: true})
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({type: [PatchDto]})
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: PatchOperation[],
        @Req() req: Request,
    ): Promise<InvoiceTemplateResponseDto> {
        this.log.debug({
            message: 'patch invoice template by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.invoiceTemplateService.read(id, sr)
        const entity = await patchToEntity<internal.InvoiceTemplate, InvoiceTemplateRequestDto>(oldEntity, patch, InvoiceTemplateRequestDto)
        const updates = new Dictionary<internal.InvoiceTemplate>()
        updates[id] = entity
        const ids = await this.invoiceTemplateService.update(updates, sr)
        const updatedEntity = await this.invoiceTemplateService.read(ids[0], sr)
        const response = new InvoiceTemplateResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
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
}
