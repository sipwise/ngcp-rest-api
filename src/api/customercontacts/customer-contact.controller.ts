import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {CustomerContactService} from './customer-contact.service'
import {CustomerContactRequestDto} from './dto/customer-contact-request.dto'
import {CustomerContactResponseDto} from './dto/customer-contact-response.dto'
import {CustomerContactSearchDto} from './dto/customer-contact-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiOneOrManyBody} from '~/decorators/api-one-or-many-body.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {Operation,Operation as PatchOperation, patchManyToEntities, patchToEntity} from '~/helpers/patch.helper'
import {validatePatchResellerId, validateResellerId} from '~/helpers/reseller-id.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'customercontacts'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.ccare,
    RbacRole.ccareadmin,
    RbacRole.reseller,
)
@ApiTags('CustomerContact')
@Controller(resourceName)
export class CustomerContactController extends CrudController<CustomerContactRequestDto, CustomerContactResponseDto> {
    private readonly log = new LoggerService(CustomerContactController.name)

    constructor(
        private readonly contactService: CustomerContactService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, contactService, journalService)
    }

    @Post()
    @ApiCreatedResponse(CustomerContactResponseDto)
    @ApiOneOrManyBody(CustomerContactRequestDto)
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerContactRequestDto})) createDto: CustomerContactRequestDto[],
        @Req() req: Request,
    ): Promise<CustomerContactResponseDto[]> {
        this.log.debug({
            message: 'create customer contacts',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        validateResellerId(createDto, sr)
        const customers = createDto.map(customer => customer.toInternal())
        const created = await this.contactService.create(customers, sr)
        const response = created.map((contact) => new CustomerContactResponseDto(contact, sr.user.role))
        await this.journalService.writeJournals(sr, response.map(entry => ({id: entry.id, data: entry})))
        return response
    }

    @Get()
    @ApiSearchQuery(SearchLogic, CustomerContactSearchDto)
    @ApiPaginatedResponse(CustomerContactResponseDto)
    async readAll(@Req() req: Request): Promise<[CustomerContactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all customer contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [contacts, totalCount] =
            await this.contactService.readAll(sr)

        const responseList = contacts.map((con) => new CustomerContactResponseDto(con, sr.user.role))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() sr): Promise<CustomerContactResponseDto> {
        this.log.debug({message: 'fetch customer contact by id', func: this.read.name, url: sr.url, method: sr.method})
        const contact = await this.contactService.read(id, new ServiceRequest(sr))
        const responseItem = new CustomerContactResponseDto(contact, sr.user.role)
        return responseItem
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomerContactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            @Req() req: Request,
    ): Promise<CustomerContactResponseDto> {
        this.log.debug({
            message: 'patch customer contact by id',
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })

        const sr = new ServiceRequest(req)
        validatePatchResellerId(new Dictionary(id.toString(), patch), sr)

        const oldEntity = await this.contactService.read(id, sr)
        const entity = await patchToEntity<internal.Contact, CustomerContactRequestDto>(oldEntity, patch, CustomerContactRequestDto)
        const update = new Dictionary<internal.Contact>(id.toString(), entity)

        const ids = await this.contactService.update(update, sr)
        const updatedEntity = await this.contactService.read(ids[0], sr)
        const response = new CustomerContactResponseDto(updatedEntity, sr.user.role)
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
        validatePatchResellerId(patches, sr)

        const updates = await patchManyToEntities<internal.Contact, CustomerContactRequestDto>(patches, id => this.contactService.read(id, sr), CustomerContactRequestDto)

        return await this.contactService.update(updates, sr)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerContactResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, @Body() entity: CustomerContactRequestDto, @Req() req): Promise<CustomerContactResponseDto> {
        this.log.debug({
            message: 'update customer contact by id',
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        validateResellerId(new Dictionary(id.toString(), entity), sr)
        const updates = new Dictionary<internal.Contact>()
        updates[id] = entity.toInternal({id: id, assignNulls: true})
        const ids = await this.contactService.update(updates, sr)
        const contact = await this.contactService.read(ids[0], sr)
        const response = new CustomerContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(CustomerContactRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerContactRequestDto})) updates: Dictionary<CustomerContactRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'update customer contacts bulk',
            func: this.updateMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        validateResellerId(updates, sr)
        const contacts = new Dictionary<internal.Contact>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerContactRequestDto = updates[id]
            contacts[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.contactService.update(contacts, sr)
    }

    @Delete('{/:id}')
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete customer contact by ids',
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })

        const sr = new ServiceRequest(req)
        const deletedIds = await this.contactService.delete(ids, sr)
        await this.journalService.writeJournals(sr, deletedIds.map(id => ({id, data: {}})))
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch customer contact journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

}
