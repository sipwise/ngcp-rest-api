import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, StreamableFile, UnprocessableEntityException, UploadedFile, UseInterceptors, ValidationPipe, forwardRef} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {I18nService} from 'nestjs-i18n'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {CustomerPhonebookService} from './customer-phonebook.service'
import {CustomerPhonebookCsvRequestDto} from './dto/customer-phonebook-csv.request.dto'
import {CustomerPhonebookQueryDto} from './dto/customer-phonebook-query.dto'
import {CustomerPhonebookRequestParamDto} from './dto/customer-phonebook-request-param.dto'
import {CustomerPhonebookRequestDto} from './dto/customer-phonebook-request.dto'
import {CustomerPhonebookResponseDto} from './dto/customer-phonebook-response.dto'
import {CustomerPhonebookSearchDto} from './dto/customer-phonebook-search.dto'
import {CustomerPhonebookTextCsvExampleResponse} from './dto/customer-phonebook-text-csv-example-response'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiAcceptHeader} from '~/decorators/api-accept-header.decorator'
import {ApiContentTypeHeader} from '~/decorators/api-content-type-header.decorator'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedMultipleResponse} from '~/decorators/api-paginated-multiple-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {BodyOrEmptyArray} from '~/decorators/body-or-empty-array.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {csvToDto, handleCsvExport} from '~/helpers/csv.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {FileMimeTypePipe} from '~/pipes/parse-file-mimetype.pipe'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'
import {ParseRegexPipe} from '~/pipes/parse-regex-id.pipe'

const resourceName = 'customers/'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.lintercept,
)
@ApiTags('Customer')
@Controller(resourceName)
@License(LicenseType.phonebook)
export class CustomerPhonebookController extends CrudController<CustomerPhonebookRequestDto, CustomerPhonebookResponseDto> {
    private readonly log = new LoggerService(CustomerPhonebookController.name)

    constructor(
        private readonly phonebookService: CustomerPhonebookService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
        private readonly i18n: I18nService,
    ) {
        super(resourceName, phonebookService)
    }

    @Post(':customerId?/phonebook')
    @ApiCreatedResponse(CustomerPhonebookResponseDto)
    @ApiBody({
        type: CustomerPhonebookRequestDto,
        isArray: true,
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null,
        },
    }))
    @ApiContentTypeHeader('application/json', 'multipart/form-data')
    @Transactional()
    async create(
        @BodyOrEmptyArray(new ParseOneOrManyPipe({items: CustomerPhonebookRequestDto})) createDto: CustomerPhonebookRequestDto[],
        @Req() req: Request,
        @UploadedFile(new FileMimeTypePipe(['text/csv'])) file,
    ): Promise<CustomerPhonebookResponseDto[]> {
        this.log.debug({
            message: 'create phonebook bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        if (file) {
            switch (file.mimetype) {
                case 'text/csv':
                    createDto = await csvToDto<CustomerPhonebookCsvRequestDto>(file, CustomerPhonebookCsvRequestDto)
                    if (!createDto)
                        throw new UnprocessableEntityException(this.i18n.t('errors.CSV_MALFORMED'))
                    break
                default:
                    throw new UnprocessableEntityException(this.i18n.t('errors.FILE_MIME_TYPE_NOT_SUPPORTED'))
            }
            const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
            const created = await this.phonebookService.importCsv(phonebook, sr)
            return await Promise.all(created.map(async phonebook => new CustomerPhonebookResponseDto(phonebook)))
        }
        const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.phonebookService.create(phonebook, sr)
        return await Promise.all(created.map(async phonebook => new CustomerPhonebookResponseDto(phonebook)))
    }

    @Get(':customerId?/phonebook')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedMultipleResponse({
        description: 'List of customer phonebook entries in JSON or CSV',
        contents: [
            {
                type: 'application/json',
                data: {
                    item: CustomerPhonebookResponseDto,
                },
            },
            {
                type: 'text/csv',
                data: {
                    example: CustomerPhonebookTextCsvExampleResponse,
                },
            },
        ],
    })
    @ApiAcceptHeader('application/json', 'application/hal+json', 'text/csv')
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: CustomerPhonebookRequestParamDto,
        @Query(new ValidationPipe()) _query: CustomerPhonebookQueryDto,
        @Res({passthrough: true}) res,
    ): Promise<[CustomerPhonebookResponseDto[], number] | StreamableFile> {
        this.log.debug({
            message: 'read all customer phonebook',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        // if accept header is csv
        if (sr.headers['accept'] === 'text/csv') {
            return handleCsvExport(await this.phonebookService.exportCsv(sr), res)
        }

        const [entity, totalCount] =
            await this.phonebookService.readAll(sr)
        const responseList = entity.map(e => new CustomerPhonebookResponseDto(e))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new CustomerPhonebookSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':customerId?/phonebook/:id')
    @ApiOkResponse({
        type: CustomerPhonebookResponseDto,
    })
    async read(
        @Param('id', new ParseRegexPipe({pattern: /^[csr\d]+$/})) id: string,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerPhonebookRequestParamDto = new CustomerPhonebookRequestParamDto(),
        @Query(new ValidationPipe()) _query: CustomerPhonebookQueryDto,
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'read customer phonebook by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new CustomerPhonebookResponseDto(await this.phonebookService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new CustomerPhonebookSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':customerId?/phonebook/:id')
    @ApiOkResponse({
        type: CustomerPhonebookResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        dto: CustomerPhonebookRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerPhonebookRequestParamDto = new CustomerPhonebookRequestParamDto(),
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'update customer phonebook by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.CustomerPhonebook>()
        updates[id] = Object.assign(new CustomerPhonebookRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.phonebookService.update(updates, sr)
        const entity = await this.phonebookService.read(ids[0], sr)
        const response = new CustomerPhonebookResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':customerId?/phonebook')
    @ApiPutBody(CustomerPhonebookRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerPhonebookRequestDto})) updates: Dictionary<CustomerPhonebookRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update customer phonebook bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.CustomerPhonebook>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerPhonebookRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.phonebookService.update(sets, sr)
    }

    @Patch(':customerId?/phonebook/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'patch phonebook set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.phonebookService.read(id, sr)
        const entity = await patchToEntity<internal.CustomerPhonebook, CustomerPhonebookRequestDto>(
            oldEntity as internal.CustomerPhonebook, patch, CustomerPhonebookRequestDto,
        )
        const update = new Dictionary<internal.CustomerPhonebook>(id.toString(), entity)

        const ids = await this.phonebookService.update(update, sr)
        const updatedEntity = await this.phonebookService.read(ids[0], sr)
        const response = new CustomerPhonebookResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':customerId?/phonebook')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.CustomerPhonebook>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.phonebookService.read(+id, sr)
            const entity = await patchToEntity<internal.CustomerPhonebook, CustomerPhonebookRequestDto>(
                oldEntity as internal.CustomerPhonebook, patches[id], CustomerPhonebookRequestDto,
            )
            updates[id] = entity
        }

        return await this.phonebookService.update(updates, sr)
    }

    @Delete(':customerId?/phonebook/:id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete customer phonebook by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.phonebookService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':customerId?/phonebook/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read phonebook journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
