import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Query, Req, ValidationPipe, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {number} from 'yargs'

import {SubscriberPhonebookQueryDto} from './dto/subscriber-phonebook-query.dto'
import {SubscriberPhonebookRequestParamDto} from './dto/subscriber-phonebook-request-param.dto'
import {SubscriberPhonebookRequestDto} from './dto/subscriber-phonebook-request.dto'
import {SubscriberPhonebookResponseDto} from './dto/subscriber-phonebook-response.dto'
import {SubscriberPhonebookSearchDto} from './dto/subscriber-phonebook-search.dto'
import {SubscriberPhonebookService} from './subscriber-phonebook.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'
import {ParseRegexPipe} from '~/pipes/parse-regex-id.pipe'

const resourceName = 'subscribers/'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
    RbacRole.lintercept,
)
@ApiTags('Subscriber')
@Controller(resourceName)
@License(LicenseType.phonebook)
export class SubscriberPhonebookController extends CrudController<SubscriberPhonebookRequestDto, SubscriberPhonebookResponseDto> {
    private readonly log = new LoggerService(SubscriberPhonebookController.name)

    constructor(
        private readonly phonebookService: SubscriberPhonebookService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, phonebookService)
    }

    @Post(':subscriberId?/phonebook')
    @ApiCreatedResponse(SubscriberPhonebookResponseDto)
    @ApiBody({
        type: SubscriberPhonebookRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: SubscriberPhonebookRequestDto})) createDto: SubscriberPhonebookRequestDto[],
        @Req() req: Request,
    ): Promise<SubscriberPhonebookResponseDto[]> {
        this.log.debug({
            message: 'create phonebook bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.phonebookService.create(phonebook, sr)
        return await Promise.all(created.map(async phonebook => new SubscriberPhonebookResponseDto(phonebook)))
    }

    @Get(':subscriberId?/phonebook')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(SubscriberPhonebookResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: SubscriberPhonebookRequestParamDto,
        @Query(new ValidationPipe()) _query: SubscriberPhonebookQueryDto,
    ): Promise<[SubscriberPhonebookResponseDto[], number]> {
        this.log.debug({
            message: 'read all subscriber phonebook',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.phonebookService.readAll(sr)
        const responseList = entity.map(e => new SubscriberPhonebookResponseDto(e))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new SubscriberPhonebookSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':subscriberId?/phonebook/:id')
    @ApiOkResponse({
        type: SubscriberPhonebookResponseDto,
    })
    async read(
        @Param('id', new ParseRegexPipe({pattern: /^[csr\d]+$/})) id: string,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {subscriberId}: SubscriberPhonebookRequestParamDto = new SubscriberPhonebookRequestParamDto(),
        @Query(new ValidationPipe()) _query: SubscriberPhonebookQueryDto,
    ): Promise<SubscriberPhonebookResponseDto> {
        this.log.debug({
            message: 'read subscriber phonebook by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new SubscriberPhonebookResponseDto(await this.phonebookService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new SubscriberPhonebookSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':subscriberId?/phonebook/:id')
    @ApiOkResponse({
        type: SubscriberPhonebookResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: SubscriberPhonebookRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {subscriberId}: SubscriberPhonebookRequestParamDto = new SubscriberPhonebookRequestParamDto(),
    ): Promise<SubscriberPhonebookResponseDto> {
        this.log.debug({
            message: 'update subscriber phonebook by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.SubscriberPhonebook>()
        updates[id] = Object.assign(new SubscriberPhonebookRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.phonebookService.update(updates, sr)
        const entity = await this.phonebookService.read(ids[0], sr)
        const response = new SubscriberPhonebookResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':subscriberId?/phonebook')
    @ApiPutBody(SubscriberPhonebookRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: SubscriberPhonebookRequestDto})) updates: Dictionary<SubscriberPhonebookRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update subscriber phonebook bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.SubscriberPhonebook>()
        for (const id of Object.keys(updates)) {
            const dto: SubscriberPhonebookRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.phonebookService.update(sets, sr)
    }

    @Patch(':subscriberId?/phonebook/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<SubscriberPhonebookResponseDto> {
        this.log.debug({
            message: 'patch phonebook set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.phonebookService.read(id, sr)
        const entity = await patchToEntity<internal.SubscriberPhonebook, SubscriberPhonebookRequestDto>(
            oldEntity as internal.SubscriberPhonebook, patch, SubscriberPhonebookRequestDto,
        )
        const update = new Dictionary<internal.SubscriberPhonebook>(id.toString(), entity)

        const ids = await this.phonebookService.update(update, sr)
        const updatedEntity = await this.phonebookService.read(ids[0], sr)
        const response = new SubscriberPhonebookResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':subscriberId?/phonebook')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.SubscriberPhonebook>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.phonebookService.read(+id, sr)
            const entity = await patchToEntity<internal.SubscriberPhonebook, SubscriberPhonebookRequestDto>(
                oldEntity as internal.SubscriberPhonebook, patches[id], SubscriberPhonebookRequestDto,
            )
            updates[id] = entity
        }

        return await this.phonebookService.update(updates, sr)
    }

    @Delete(':subscriberId?/phonebook/:id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete subscriber phonebook by id',
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

    @Get(':subscriberId?/phonebook/:id/journal')
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
