import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {SubscriberResponseDto} from './dto/subscriber-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'subscribers'

@Auth(
    RbacRole.lintercept,
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccare,
    RbacRole.ccareadmin,
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
)
@ApiTags('Subscriber')
@Controller(resourceName)
export class SubscriberController extends CrudController<never, SubscriberResponseDto> {
    private readonly log = new LoggerService(SubscriberController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(SubscriberResponseDto)
    async readAll(@Req() req: Request): Promise<[SubscriberResponseDto[], number]> {
        this.log.debug({message: 'fetch all subscribers', func: this.readAll.name, url: req.url, method: req.method})
        const response = [new SubscriberResponseDto({url: req.url})]
        return [response, 1]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) _id: number, @Req() req: Request): Promise<SubscriberResponseDto> {
        this.log.debug({message: 'fetch subscriber by id', func: this.read.name, url: req.url, method: req.method})
        const response = new SubscriberResponseDto({url: req.url})
        return response
    }
}
