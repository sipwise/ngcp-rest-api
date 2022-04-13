import {Controller, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerCreateDto} from './dto/customer-create.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {CustomersService} from './customers.service'
import {JournalsService} from '../journals/journals.service'
import {Request} from 'express'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomerSearchDto} from './dto/customer-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'customers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccare,
    RbacRole.ccareadmin,
)
@ApiTags('Customers')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomersController extends CrudController<CustomerCreateDto, CustomerResponseDto> {
    private readonly log: Logger = new Logger(CustomersController.name)
    constructor(
        private readonly customerService: CustomersService,
        private readonly journalService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomerResponseDto,
    })
    async create(entity: CustomerCreateDto, req: Request): Promise<CustomerResponseDto> {
        this.log.debug({message: 'create customer', func: this.create.name, url: req.url, method: req.method})
        return this.customerService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerResponseDto)
    async readAll(req): Promise<[CustomerResponseDto[], number]> {
        this.log.debug({message: 'fetch all customers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.customerService.readAll(sr)
        if (req.query.expand) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseList, customerSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomerResponseDto> {
        this.log.debug({message: 'fetch customer by id', func: this.read.name, url: req.url, method: req.method})
        return this.customerService.read(id, this.newServiceRequest(req))
        const responseItem = await this.customerService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseItem, customerSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: CustomerCreateDto, req): Promise<CustomerResponseDto> {
        this.log.debug({message: 'update customer by id', func: this.update.name, url: req.url, method: req.method})
        return this.customerService.update(id, dto, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomerResponseDto> {
        this.log.debug({message: 'patch customer by id', func: this.adjust.name, url: req.url, method: req.method})
        return this.customerService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete customer by id', func: this.delete.name, url: req.url, method: req.method})
        return this.customerService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch customer journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, page, row, req)
    }
}
