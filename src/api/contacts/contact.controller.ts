import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    forwardRef,
} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {ContactService} from './contact.service'
import {ContactRequestDto} from './dto/contact-request.dto'
import {ContactResponseDto} from './dto/contact-response.dto'
import {ContactSearchDto} from './dto/contact-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation,Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'contacts'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.ccareadmin,
)
@ApiTags('Contact')
@Controller(resourceName)
export class ContactController extends CrudController<ContactRequestDto, ContactResponseDto> {
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
        type: ContactRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: ContactRequestDto})) entity: ContactRequestDto[],
        @Req() req: Request,
    ): Promise<ContactResponseDto[]> {
        this.log.debug({message: 'create contact', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const contacts = entity.map(contact => contact.toInternal())
        const created = await this.contactService.create(contacts, sr)
        const response = created.map(contact => new ContactResponseDto(contact, sr.user.role))
        for(const entry of response) {
            await this.journalService.writeJournal(sr, entry.id, entry)
        }
        return response
    }

    @Get()
    @ApiOkResponse({
        type: [ContactResponseDto],
    })
    async readAll(@Req() req: Request): Promise<[ContactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = new ServiceRequest(req)
        const [contacts, count] = await this.contactService.readAll(sr)
        const responseList = contacts.map(contact => new ContactResponseDto(contact, sr.user.role))
        if (sr.query.expand) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<ContactResponseDto> {
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.read(id, sr)
        const responseItem = new ContactResponseDto(contact, sr.user.role)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects([responseItem], contactSearchDtoKeys, sr)
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
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<ContactResponseDto> {
        this.log.debug({message: 'patch contact by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.contactService.read(id, sr)
        const entity = await patchToEntity<internal.Contact, ContactRequestDto>(oldEntity, patch, ContactRequestDto)
        const update = new Dictionary<internal.Contact>(id.toString(), entity)

        const ids = await this.contactService.update(update, sr)
        const updatedEntity = await this.contactService.read(ids[0], sr)
        const response = new ContactResponseDto(updatedEntity, sr.user.role)
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
            const entity = await patchToEntity<internal.Contact, ContactRequestDto>(oldEntity, patches[id], ContactRequestDto)
            updates[id] = entity
        }

        return await this.contactService.update(updates, sr)
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, entity: ContactRequestDto, req): Promise<ContactResponseDto> {
        this.log.debug({message: 'update contact by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Contact>()
        updates[id] = entity.toInternal({id: id, assignNulls: true})
        const ids = await this.contactService.update(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new ContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(ContactRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: ContactRequestDto})) updates: Dictionary<ContactRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update contacts bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contacts = new Dictionary<internal.Contact>()
        for (const id of Object.keys(updates)) {
            const dto: ContactRequestDto = updates[id]
            contacts[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.contactService.update(contacts, sr)
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
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch customer contact journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
