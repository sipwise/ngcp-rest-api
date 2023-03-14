import {
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalService} from '../journals/journal.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {Request} from 'express'
import {number} from 'yargs'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {PatchDto} from '../../dto/patch.dto'
import {Operation as PatchOperation, Operation} from '../../helpers/patch.helper'
import {ContactService} from './contact.service'
import {ContactCreateDto} from './dto/contact-create.dto'
import {ContactResponseDto} from './dto/contact-response.dto'
import {ContactSearchDto} from './dto/contact-search.dto'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {LoggerService} from '../../logger/logger.service'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'
import {ParseIntIdArrayPipe} from '../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'
import {ApiPutBody} from '../../decorators/api-put-body.decorator'
import {ParseIdDictionary} from '../../pipes/parse-id-dictionary.pipe'
import {internal} from '../../entities'
import {Dictionary} from '../../helpers/dictionary.helper'
import {ParsePatchPipe} from '../../pipes/parse-patch.pipe'

const resourceName = 'contacts'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.ccareadmin)
@ApiTags('Contact')
@Controller(resourceName)
export class ContactController extends CrudController<ContactCreateDto, ContactResponseDto> {
    private readonly log = new LoggerService(ContactController.name)

    constructor(
        private readonly contactService: ContactService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactService, journalService)
    }

    @Post()
    @ApiCreatedResponse(ContactResponseDto)
    @ApiBody({
        type: ContactCreateDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: ContactCreateDto})) entity: ContactCreateDto[],
        @Req() req: Request,
    ): Promise<ContactResponseDto> {
        this.log.debug({message: 'create contact', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.create(entity[0].toInternal(), sr)  // TODO: change to create multiple
        const response = new ContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Get()
    @ApiOkResponse({
        type: [ContactResponseDto],
    })
    async readAll(@Req() req): Promise<[ContactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = new ServiceRequest(req)
        const [contacts, count] = await this.contactService.readAll(sr)
        const responseList = contacts.map(contact => new ContactResponseDto(contact, sr.user.role))
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ContactResponseDto> {
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.read(id, sr)
        const responseItem = new ContactResponseDto(contact, sr.user.role)
        if (req.query.expand && !req.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        req,
    ): Promise<ContactResponseDto> {
        this.log.debug({message: 'patch contact by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<Operation[]>()

        updates[id] = patch

        const ids = await this.contactService.adjust(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new ContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) updates: Dictionary<PatchOperation[]>,
        @Req() req,
    ) {
        const sr = new ServiceRequest(req)
        return await this.contactService.adjust(updates, sr)
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: ContactCreateDto, req): Promise<ContactResponseDto> {
        this.log.debug({message: 'update contact by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Contact>()
        updates[id] = entity.toInternal(id)
        const ids = await this.contactService.update(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new ContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(ContactCreateDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: ContactCreateDto})) updates: Dictionary<ContactCreateDto>,
        @Req() req,
    ) {
        this.log.debug({message: 'update contacts bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contacts = new Dictionary<internal.Contact>()
        for (const id of Object.keys(updates)) {
            const dto: ContactCreateDto = updates[id]
            contacts[id] = dto.toInternal(parseInt(id))
        }
        return await this.contactService.update(contacts, sr)
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)
        this.log.debug({message: 'delete contacts by id', func: this.delete.name, url: req.url, method: req.method})
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
        this.log.debug({
            message: 'fetch customer contact journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
