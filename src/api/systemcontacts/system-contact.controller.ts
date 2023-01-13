import {Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalService} from '../journals/journal.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemContactResponseDto} from './dto/system-contact-response.dto'
import {SystemContactCreateDto} from './dto/system-contact-create.dto'
import {SystemContactService} from './system-contact.service'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {number} from 'yargs'
import {ExpandHelper} from '../../helpers/expand.helper'
import {SystemContactSearchDto} from './dto/system-contact-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Request} from 'express'

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
    @ApiCreatedResponse({
        type: SystemContactResponseDto,
    })
    async create(entity: SystemContactCreateDto, req): Promise<SystemContactResponseDto> {
        this.log.debug({message: 'create system contact', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.create(entity.toInternal(), sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Post('bulk')
    @ApiCreatedResponse({
        type: [SystemContactResponseDto],
    })
    async createMany(
        @Body(new ParseArrayPipe({items: SystemContactCreateDto})) createDto: SystemContactCreateDto[],
        @Req() req: Request,
    ): Promise<SystemContactResponseDto[]> {
        this.log.debug({
            message: 'create system contact bulk',
            func: this.createMany.name,
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
        this.log.debug({message: 'update system contact by id', func: this.update.name, id: id, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.update(id, entity.toInternal(), sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<SystemContactResponseDto> {
        this.log.debug({message: 'patch system contact by id', func: this.adjust.name, id: id, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.adjust(id, patch, sr)
        const response = new SystemContactResponseDto(contact)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete system contact by id', func: this.delete.name, id: id, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.contactService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
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
