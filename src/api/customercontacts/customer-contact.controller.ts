import {
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    Param,
    ParseArrayPipe,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {
    ApiBody,
    ApiConsumes,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CustomerContactService} from './customer-contact.service'
import {CustomerContactCreateDto} from './dto/customer-contact-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerContactResponseDto} from './dto/customer-contact-response.dto'
import {JournalService} from '../journals/journal.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {number} from 'yargs'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../../dto/patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomerContactSearchDto} from './dto/customer-contact-search.dto'
import {PaginatedDto} from '../../dto/paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'

const resourceName = 'customercontacts'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.ccare, RbacRole.ccareadmin, RbacRole.reseller)
@ApiTags('CustomerContact')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomerContactController extends CrudController<CustomerContactCreateDto, CustomerContactResponseDto> {
    private readonly log = new LoggerService(CustomerContactController.name)

    constructor(
        private readonly contactService: CustomerContactService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactService, journalService)
    }

    @Post()
    @ApiCreatedResponse(CustomerContactResponseDto)
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerContactCreateDto})) createDto: CustomerContactCreateDto[],
        @Req() req: Request,
    ): Promise<CustomerContactResponseDto[]> {
        this.log.debug({
            message: 'create customer contacts',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const customers = createDto.map(customer => customer.toInternal())
        const created = await this.contactService.createMany(customers, sr)
        return created.map((contact) => new CustomerContactResponseDto(contact, sr.user.role))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerContactResponseDto)
    async readAll(@Req() req): Promise<[CustomerContactResponseDto[], number]> {
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
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new CustomerContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, sr): Promise<CustomerContactResponseDto> {
        this.log.debug({message: 'fetch customer contact by id', func: this.read.name, url: sr.url, method: sr.method})
        const contact = await this.contactService.read(id, new ServiceRequest(sr))
        const responseItem = new CustomerContactResponseDto(contact, sr.user.role)
        if (sr.query.expand && !sr.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new CustomerContactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, sr)
        }
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
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomerContactResponseDto> {
        this.log.debug({message: 'patch customer contact by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.adjust(id, patch, sr)
        const response = new CustomerContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerContactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: CustomerContactCreateDto, req): Promise<CustomerContactResponseDto> {
        this.log.debug({message: 'update customer contact by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contact = await this.contactService.update(id, entity.toInternal(), sr)
        const response = new CustomerContactResponseDto(contact, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete customer contact by id', func: this.delete.name, url: req.url, method: req.method})
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
        this.log.debug({message: 'fetch customer contact journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

}
