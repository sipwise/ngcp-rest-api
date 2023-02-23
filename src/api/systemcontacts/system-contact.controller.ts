import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalService} from '../journals/journal.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemContactResponseDto} from './dto/system-contact-response.dto'
import {SystemContactCreateDto} from './dto/system-contact-create.dto'
import {SystemContactService} from './system-contact.service'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../../dto/patch.dto'
import {number} from 'yargs'
import {ExpandHelper} from '../../helpers/expand.helper'
import {SystemContactSearchDto} from './dto/system-contact-search.dto'
import {PaginatedDto} from '../../dto/paginated.dto'
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

const resourceName = 'systemcontacts'

@Auth(RbacRole.system, RbacRole.admin)
@ApiTags('SystemContact')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class SystemContactController extends CrudController<SystemContactCreateDto, SystemContactResponseDto> {
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
        type: SystemContactCreateDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: SystemContactCreateDto})) createDto: SystemContactCreateDto[],
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
        const created = await this.contactService.createMany(contacts, sr)
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
            await this.expander.expandObjects(response, contactSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemContactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: SystemContactCreateDto, req): Promise<SystemContactResponseDto> {
        this.log.debug({
            message: 'update system contact by id',
            func: this.update.name,
            id: id,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Contact>()
        updates[id] = entity.toInternal(id)
        const ids = await this.contactService.update(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(SystemContactCreateDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: SystemContactCreateDto})) updates: Dictionary<SystemContactCreateDto>,
        @Req() req,
    ) {
        this.log.debug({
            message: 'update system contacts bulk',
            func: this.updateMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const contacts = new Dictionary<internal.Contact>()
        for (const id of Object.keys(updates)) {
            const dto: SystemContactCreateDto = updates[id]
            contacts[id] = dto.toInternal(parseInt(id))
        }
        return await this.contactService.update(contacts, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<SystemContactResponseDto> {
        this.log.debug({
            message: 'patch system contact by id',
            func: this.adjust.name,
            id: id,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const ids = await this.contactService.adjust(id, patch, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({message: 'delete system contact by id', func: this.delete.name, ids: ids, url: req.url, method: req.method})

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
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({message: 'fetch system contact journal by id', func: this.journal.name, id: id, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
