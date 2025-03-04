import {Controller, Get, Inject, Param, ParseIntPipe, Req, forwardRef} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {CustomerService} from './customer.service'
import {CustomerRequestDto} from './dto/customer-request.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'

import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'customers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccare,
    RbacRole.ccareadmin,
    RbacRole.subscriberadmin,
)
@ApiTags('Customer')
@Controller(resourceName)
export class CustomerController extends CrudController<CustomerRequestDto, CustomerResponseDto> {
    private readonly log = new LoggerService(CustomerController.name)

    constructor(
        private readonly customerService: CustomerService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerResponseDto)
    async readAll(@Req() req: Request): Promise<[CustomerResponseDto[], number]> {
        this.log.debug({message: 'fetch all customers', func: this.readAll.name, url: req.url, method: req.method})
        const response = [new CustomerResponseDto({url: req.url})]
        return [response, 1]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) _id: number, @Req() req: Request): Promise<CustomerResponseDto> {
        this.log.debug({message: 'fetch customer by id', func: this.read.name, url: req.url, method: req.method})
        const response = new CustomerResponseDto({url: req.url})
        return response
    }
}
