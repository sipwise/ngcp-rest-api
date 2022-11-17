import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Controller, forwardRef, Get, Inject, Param, ParseIntPipe, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {LoggerService} from '../../logger/logger.service'
import {JournalService} from '../journals/journal.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {CustomerNumberService} from './customer-number.service'
import {CustomerNumberResponseDto} from './dto/customer-number-response.dto'
import {AppService} from '../../app.service'

const resourceName = 'customernumbers'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.reseller, RbacRole.subscriberadmin)
@ApiTags('CustomerNumber')
@Controller(resourceName)
export class CustomerNumberController extends CrudController<never, CustomerNumberResponseDto> {
    private readonly log = new LoggerService(CustomerNumberController.name)

    constructor(
        private readonly app: AppService,
        private readonly customerNumberService: CustomerNumberService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerNumberService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [CustomerNumberResponseDto],
    })
    async readAll(@Req() req): Promise<[CustomerNumberResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all customer numbers',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = this.newServiceRequest(req)
        const [contacts, count] = await this.customerNumberService.readAll(sr)
        const responseList = contacts.map(num => new CustomerNumberResponseDto(num))
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerNumberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomerNumberResponseDto> {
        this.log.debug({
            message: 'fetch customer number by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
            id: id
        })
        const sr = this.newServiceRequest(req)
        const customerNumber = await this.customerNumberService.read(id, sr)
        return new CustomerNumberResponseDto(customerNumber)
    }
}
