import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, StreamableFile, UnprocessableEntityException, UploadedFile, UseInterceptors, ValidationPipe, forwardRef} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {I18nService} from 'nestjs-i18n'
import {number} from 'yargs'

import {ResellerPhonebookCsvRequestDto} from './dto/reseller-phonebook-csv-request.dto'
import {ResellerPhonebookRequestParamDto} from './dto/reseller-phonebook-request-param.dto'
import {ResellerPhonebookRequestDto} from './dto/reseller-phonebook-request.dto'
import {ResellerPhonebookResponseDto} from './dto/reseller-phonebook-response.dto'
import {ResellerPhonebookSearchDto} from './dto/reseller-phonebook-search.dto'
import {ResellerPhonebookService} from './reseller-phonebook.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {BodyOrEmptyArray} from '~/decorators/body-or-empty-array.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {ValidContentTypes} from '~/decorators/valid-content-type.decorator'
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

const resourceName = 'resellers/'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('Reseller')
@Controller(resourceName)
@License(LicenseType.phonebook)
export class ResellerPhonebookController extends CrudController<ResellerPhonebookRequestDto, ResellerPhonebookResponseDto> {
    private readonly log = new LoggerService(ResellerPhonebookController.name)

    constructor(
        private readonly phonebookService: ResellerPhonebookService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
        private readonly i18n: I18nService,
    ) {
        super(resourceName, phonebookService)
    }

    @Post(':resellerId?/phonebook')
    @ApiCreatedResponse(ResellerPhonebookResponseDto)
    @ApiBody({
        type: ResellerPhonebookRequestDto,
        isArray: true,
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null,
        },
    }))
    @ValidContentTypes('application/json', 'multipart/form-data')
    async create(
        @BodyOrEmptyArray(new ParseOneOrManyPipe({items: ResellerPhonebookRequestDto})) createDto: ResellerPhonebookRequestDto[],
        @Req() req: Request,
        @UploadedFile(new FileMimeTypePipe(['text/csv'])) file,
    ): Promise<ResellerPhonebookResponseDto[]> {
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
                    createDto = await csvToDto<ResellerPhonebookCsvRequestDto>(file, ResellerPhonebookCsvRequestDto)
                    if (!createDto)
                        throw new UnprocessableEntityException(this.i18n.t('errors.CSV_MALFORMED'))
                    break
                default:
                    throw new UnprocessableEntityException(this.i18n.t('errors.FILE_MIME_TYPE_NOT_SUPPORTED'))
            }
            const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
            const created = await this.phonebookService.import(phonebook, sr)
            return await Promise.all(created.map(async phonebook => new ResellerPhonebookResponseDto(phonebook)))
        }
        const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.phonebookService.create(phonebook, sr)
        return await Promise.all(created.map(async phonebook => new ResellerPhonebookResponseDto(phonebook)))
    }

    @Get(':resellerId?/phonebook')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ResellerPhonebookResponseDto)
    @ValidContentTypes('application/json', 'text/csv')
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: ResellerPhonebookRequestParamDto,
        @Query() _query: unknown,
        @Res({passthrough: true}) res,
    ): Promise<[ResellerPhonebookResponseDto[], number] | StreamableFile> {
        this.log.debug({
            message: 'read all reseller phonebook',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        if (sr.headers['content-type'] === 'text/csv') {
            return handleCsvExport(await this.phonebookService.export(sr), res)
        }

        const [entity, totalCount] = await this.phonebookService.readAll(sr)
        const responseList = entity.map(e => new ResellerPhonebookResponseDto(e))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new ResellerPhonebookSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':resellerId?/phonebook/:id')
    @ApiOkResponse({
        type: ResellerPhonebookResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {resellerId}: ResellerPhonebookRequestParamDto = new ResellerPhonebookRequestParamDto(),
    ): Promise<ResellerPhonebookResponseDto> {
        this.log.debug({
            message: 'read reseller phonebook by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new ResellerPhonebookResponseDto(await this.phonebookService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new ResellerPhonebookSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':resellerId?/phonebook/:id')
    @ApiOkResponse({
        type: ResellerPhonebookResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: ResellerPhonebookRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {resellerId}: ResellerPhonebookRequestParamDto = new ResellerPhonebookRequestParamDto(),
    ): Promise<ResellerPhonebookResponseDto> {
        this.log.debug({
            message: 'update reseller phonebook by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.ResellerPhonebook>()
        updates[id] = Object.assign(new ResellerPhonebookRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.phonebookService.update(updates, sr)
        const entity = await this.phonebookService.read(ids[0], sr)
        const response = new ResellerPhonebookResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':resellerId?/phonebook')
    @ApiPutBody(ResellerPhonebookRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: ResellerPhonebookRequestDto})) updates: Dictionary<ResellerPhonebookRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update reseller phonebook bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.ResellerPhonebook>()
        for (const id of Object.keys(updates)) {
            const dto: ResellerPhonebookRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.phonebookService.update(sets, sr)
    }

    @Patch(':resellerId?/phonebook/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<ResellerPhonebookResponseDto> {
        this.log.debug({
            message: 'patch phonebook set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.phonebookService.read(id, sr)
        const entity = await patchToEntity<internal.ResellerPhonebook, ResellerPhonebookRequestDto>(oldEntity, patch, ResellerPhonebookRequestDto)
        const update = new Dictionary<internal.ResellerPhonebook>(id.toString(), entity)

        const ids = await this.phonebookService.update(update, sr)
        const updatedEntity = await this.phonebookService.read(ids[0], sr)
        const response = new ResellerPhonebookResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':resellerId?/phonebook')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.ResellerPhonebook>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.phonebookService.read(+id, sr)
            const entity = await patchToEntity<internal.ResellerPhonebook, ResellerPhonebookRequestDto>(oldEntity, patches[id], ResellerPhonebookRequestDto)
            updates[id] = entity
        }

        return await this.phonebookService.update(updates, sr)
    }

    @Delete(':resellerId?/phonebook/:id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete reseller phonebook by id',
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

    @Get(':resellerId?/phonebook/:id/journal')
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
