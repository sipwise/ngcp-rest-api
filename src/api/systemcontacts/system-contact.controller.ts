import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {SystemContactRequestDto} from './dto/system-contact-request.dto'
import {SystemContactResponseDto} from './dto/system-contact-response.dto'
import {SystemContactSearchDto} from './dto/system-contact-search.dto'
import {SystemContactService} from './system-contact.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation,Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'systemcontacts'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('SystemContact')
@Controller(resourceName)
export class SystemContactController extends CrudController<SystemContactRequestDto, SystemContactResponseDto> {
    private readonly log = new LoggerService(SystemContactController.name)

    constructor(
        private readonly contactService: SystemContactService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactService, journalService)
    }

    @Post()
    @ApiCreatedResponse(SystemContactResponseDto)
    @ApiBody({
        type: SystemContactRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: SystemContactRequestDto})) createDto: SystemContactRequestDto[],
        @Req() req: Request,
    ): Promise<SystemContactResponseDto[]> {
        this.log.debug({
            message: 'create system contacts',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const contacts = createDto.map(contact => contact.toInternal())
        const created = await this.contactService.create(contacts, sr)
        return created.map((contact) => new SystemContactResponseDto(contact))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(SystemContactResponseDto)
    async readAll(@Req() req: Request): Promise<[SystemContactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all system contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [contacts, totalCount] =
            await this.contactService.readAll(sr)
        const responseList = contacts.map(contact => new SystemContactResponseDto(contact))
        if (sr.query.expand) {
            const contactSearchDtoKeys = Object.keys(new SystemContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SystemContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<SystemContactResponseDto> {
        this.log.debug({message: 'fetch system contact by id', func: this.read.name, id: id, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.read(id, sr)
        const response = new SystemContactResponseDto(contact)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const contactSearchDtoKeys = Object.keys(new SystemContactSearchDto())
            await this.expander.expandObjects([response], contactSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemContactResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, entity: SystemContactRequestDto, req): Promise<SystemContactResponseDto> {
        this.log.debug({
            message: 'update system contact by id',
            func: this.update.name,
            id: id,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Contact>()
        updates[id] = entity.toInternal({id: id, assignNulls: true})
        const ids = await this.contactService.update(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(SystemContactRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: SystemContactRequestDto})) updates: Dictionary<SystemContactRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'update system contacts bulk',
            func: this.updateMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const contacts = new Dictionary<internal.Contact>()
        for (const id of Object.keys(updates)) {
            const dto: SystemContactRequestDto = updates[id]
            contacts[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.contactService.update(contacts, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<SystemContactResponseDto> {
        this.log.debug({
            message: 'patch system contact by id',
            func: this.adjust.name,
            id: id,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.contactService.read(id, sr)
        const entity = await patchToEntity<internal.Contact, SystemContactRequestDto>(oldEntity, patch, SystemContactRequestDto)
        const update = new Dictionary<internal.Contact>(id.toString(), entity)

        const ids = await this.contactService.update(update, sr)
        const updatedEntity = await this.contactService.read(ids[0], sr)
        const response = new SystemContactResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.Contact>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.contactService.read(+id, sr)
            const entity = await patchToEntity<internal.Contact, SystemContactRequestDto>(oldEntity, patches[id], SystemContactRequestDto)
            updates[id] = entity
        }

        return await this.contactService.update(updates, sr)
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
            message: 'delete system contact by id',
            func: this.delete.name,
            ids: ids,
            url: req.url,
            method: req.method,
        })

        const sr = new ServiceRequest(req)
        const deletedIds = await this.contactService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch system contact journal by id', func: this.journal.name, id: id, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
