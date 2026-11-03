import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Req,
    Response,
    StreamableFile,
} from '@nestjs/common'
import {ApiOkResponse, ApiProduces, ApiTags} from '@nestjs/swagger'
import {Request, Response as ExpressResponse} from 'express'

import {InvoiceRequestDto} from './dto/invoice-request.dto'
import {InvoiceResponseDto} from './dto/invoice-response.dto'
import {InvoiceSearchDto} from './dto/invoice-search.dto'
import {InvoiceService, invoiceMimeType} from './invoice.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'

const resourceName = 'invoices'

@ApiTags('Invoice')
@Controller(resourceName)
@License(LicenseType.invoice)
@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
)
export class InvoiceController extends CrudController<InvoiceRequestDto, InvoiceResponseDto> {
    private readonly log = new LoggerService(InvoiceController.name)

    constructor(
        private readonly invoiceService: InvoiceService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, invoiceService, journalService)
    }

    @Post()
    @ApiCreatedResponse(InvoiceResponseDto)
    @Transactional()
    async create(@Body() createDto: InvoiceRequestDto, @Req() req: Request): Promise<InvoiceResponseDto[]> {
        this.log.debug({message: 'create invoice', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [invoice] = await this.invoiceService.create([createDto.toInternal()], sr)
        const response = new InvoiceResponseDto(invoice, {url: req.url})
        await this.journalService.writeJournal(sr, invoice.id, response)
        return [response]
    }

    @Get()
    @ApiSearchQuery(SearchLogic, InvoiceSearchDto)
    @ApiPaginatedResponse(InvoiceResponseDto)
    async readAll(@Req() req: Request): Promise<[InvoiceResponseDto[], number]> {
        this.log.debug({message: 'fetch all invoices', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [invoices, totalCount] = await this.invoiceService.readAll(sr)
        const responseList = invoices.map((e) => new InvoiceResponseDto(e, {url: req.url}))
        if (sr.query.expand) {
            const searchDtoKeys = Object.keys(new InvoiceSearchDto())
            await this.expander.expandObjects(responseList, searchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiProduces('application/json', invoiceMimeType)
    @ApiOkResponse({
        description: `Invoice, or the pdf as an attachment when requested with \`Accept: ${invoiceMimeType}\``,
        type: InvoiceResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Response({passthrough: true}) res: ExpressResponse,
    ): Promise<InvoiceResponseDto | StreamableFile> {
        this.log.debug({message: 'fetch invoice by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        res.vary('Accept')
        if (req.accepts(['application/json', invoiceMimeType]) == invoiceMimeType) {
            // the file is sent as is, it must not be transformed to json (see TransformInterceptor)
            res['passthrough'] = true
            return await this.invoiceService.readFile(id, sr)
        }
        const invoice = await this.invoiceService.read(id, sr)
        const responseItem = new InvoiceResponseDto(invoice, {url: req.url, containsResourceId: true})
        if (sr.query.expand && !sr.isInternalRedirect) {
            const searchDtoKeys = Object.keys(new InvoiceSearchDto())
            await this.expander.expandObjects([responseItem], searchDtoKeys, sr)
        }
        return responseItem
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
        this.log.debug({message: 'delete invoices by ids', id: ids, func: this.delete.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const deletedIds = await this.invoiceService.delete(ids.map(Number), sr)
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
        this.log.debug({message: 'fetch invoice journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
