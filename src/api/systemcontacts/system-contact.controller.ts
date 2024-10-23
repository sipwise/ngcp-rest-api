import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalService} from '../journals/journal.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemContactResponseDto} from './dto/system-contact-response.dto'
import {SystemContactRequestDto} from './dto/system-contact-request.dto'
import {SystemContactService} from './system-contact.service'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {Operation as PatchOperation, Operation, patchToEntity} from '../../helpers/patch.helper'
import {PatchDto} from '../../dto/patch.dto'
import {number} from 'yargs'
import {ExpandHelper} from '../../helpers/expand.helper'
import {SystemContactSearchDto} from './dto/system-contact-search.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Request} from 'express'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'
import {ParseIntIdArrayPipe} from '../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'
import {internal} from '../../entities'
import {ApiPutBody} from '../../decorators/api-put-body.decorator'
import {ParseIdDictionary} from '../../pipes/parse-id-dictionary.pipe'
import {Dictionary} from '../../helpers/dictionary.helper'
import {ParsePatchPipe} from '../../pipes/parse-patch.pipe'

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
    async readAll(@Req() req): Promise<[SystemContactResponseDto[], number]> {
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
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new SystemContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SystemContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<SystemContactResponseDto> {
        this.log.debug({message: 'fetch system contact by id', func: this.read.name, id: id, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.read(id, sr)
        const response = new SystemContactResponseDto(contact)
        if (req.query.expand && !req.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new SystemContactSearchDto())
            await this.expander.expandObjects([response], contactSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemContactResponseDto,
    })
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
    async updateMany(
        @Body(new ParseIdDictionary({items: SystemContactRequestDto})) updates: Dictionary<SystemContactRequestDto>,
        @Req() req,
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
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req,
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
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
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
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req,
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
