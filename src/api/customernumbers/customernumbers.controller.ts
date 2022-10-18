import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Controller, forwardRef, Get, Inject, Param, ParseIntPipe, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {ContactResponseDto} from '../contacts/dto/contact-response.dto'
import {LoggerService} from '../../logger/logger.service'
import {JournalsService} from '../journals/journals.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {CustomernumbersService} from './customernumbers.service'
import {CustomernumberResponseDto} from './dto/customernumber-response.dto'

const resourceName = 'customernumbers'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.reseller)
@ApiTags('Customer Numbers')
@Controller(resourceName)
export class CustomernumbersController extends CrudController<never, ContactResponseDto> {
    private readonly log = new LoggerService(CustomernumbersController.name)

    constructor(
        private readonly customerNumberService: CustomernumbersService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerNumberService, journalsService)
    }

    @Get()
    @ApiOkResponse({
        type: [ContactResponseDto],
    })
    async readAll(@Req() req): Promise<[CustomernumberResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all customer numbers',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = this.newServiceRequest(req)
        const [contacts, count] = await this.customerNumberService.readAll(sr)
        const responseList = contacts.map(num => new CustomernumberResponseDto(num))
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomernumberResponseDto> {
        this.log.debug({
            message: 'fetch customer number by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
            id: id
        })
        const sr = this.newServiceRequest(req)
        const customerNumber = await this.customerNumberService.read(id, sr)
        return new CustomernumberResponseDto(customerNumber)
    }
}
