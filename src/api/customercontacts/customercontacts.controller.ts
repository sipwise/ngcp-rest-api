import {
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
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactCreateDto} from './dto/customercontact-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {CustomercontactResponseDto} from './dto/customercontact-response.dto'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {number} from 'yargs'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomercontactSearchDto} from './dto/customercontact-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'

const resourceName = 'customercontacts'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.ccare, RbacRole.ccareadmin, RbacRole.reseller)
@ApiTags('Customer Contacts')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomercontactsController extends CrudController<CustomercontactCreateDto, CustomercontactResponseDto> {
    private readonly log = new LoggerService(CustomercontactsController.name)

    constructor(
        private readonly contactsService: CustomercontactsService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomercontactResponseDto,
    })
    async create(entity: CustomercontactCreateDto, req: Request): Promise<CustomercontactResponseDto> {
        this.log.debug({message: 'create customer contact', func: this.create.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const contact = await this.contactsService.create(entity.toInternal(), sr)
        const response = new CustomercontactResponseDto(contact, sr.user.role)
        await this.journalsService.writeJournal(sr, response.id, response)
        return  response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomercontactResponseDto)
    async readAll(@Req() req): Promise<[CustomercontactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all customer contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = this.newServiceRequest(req)
        const [contacts, totalCount] =
            await this.contactsService.readAll(sr)

        const responseList = contacts.map((con) => new CustomercontactResponseDto(con, sr.user.role))
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new CustomercontactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, sr): Promise<CustomercontactResponseDto> {
        this.log.debug({message: 'fetch customer contact by id', func: this.read.name, url: sr.url, method: sr.method})
        const contact = await this.contactsService.read(id, this.newServiceRequest(sr))
        const responseItem = new CustomercontactResponseDto(contact, sr.user.role)
        if (sr.query.expand && !sr.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new CustomercontactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomercontactResponseDto> {
        this.log.debug({message: 'patch customer contact by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const contact = await this.contactsService.adjust(id, patch, sr)
        const response = new CustomercontactResponseDto(contact, sr.user.role)
        await this.journalsService.writeJournal(sr, id, response)
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: CustomercontactCreateDto, req): Promise<CustomercontactResponseDto> {
        this.log.debug({message: 'update customer contact by id', func: this.update.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const contact = await this.contactsService.update(id, entity.toInternal(), sr)
        const response = new CustomercontactResponseDto(contact, sr.user.role)
        await this.journalsService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete customer contact by id', func: this.delete.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const response = await this.contactsService.delete(id, sr)
        await this.journalsService.writeJournal(sr, id, {})
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
