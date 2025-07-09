import {Controller, Get, Post, Req} from '@nestjs/common'
import {ApiCreatedResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'

import {ClearCallCounterService} from './clear-call-counter.service'
import {ClearCallCounterResponseDto} from './dto/clear-call-counter-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



const resourceName = 'clearcallcounters'

@Auth(RbacRole.system)
@ApiTags('ClearCallCounter')
@Controller(resourceName)
export class ClearCallCounterController extends CrudController<never, ClearCallCounterResponseDto> {
    private readonly log = new LoggerService(ClearCallCounterController.name)

    constructor(
        private readonly clearCallCounterService: ClearCallCounterService,
    ) {
        super(resourceName, clearCallCounterService)
    }

    @Post()
    @ApiCreatedResponse()
    @Transactional()
    async create(_: never[], @Req() req: Request): Promise<void> {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        await this.clearCallCounterService.create(sr)
    }

    @Get()
    @ApiPaginatedResponse(ClearCallCounterResponseDto)
    async readAll(@Req() req: Request): Promise<[ClearCallCounterResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all call counters',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = new ServiceRequest(req)
        const [callIds, count] = await this.clearCallCounterService.readAll(sr)
        const responseList = callIds.map(callId => new ClearCallCounterResponseDto(callId))
        return [responseList, count]
    }
}
