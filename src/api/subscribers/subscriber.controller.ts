import {Controller, Get, Param, ParseIntPipe, Query, Req, ValidationPipe} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {SubscriberQueryDto} from './dto/subscriber-query.dto'
import {SubscriberResponseDto} from './dto/subscriber-response.dto'
import {SubscriberSearchDto} from './dto/subscriber-search.dto'
import {SubscriberService} from './subscriber.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'subscribers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
)
@ApiTags('Subscriber')
@Controller(resourceName)
export class SubscriberController extends CrudController<never, SubscriberResponseDto> {
    private readonly log = new LoggerService(SubscriberController.name)

    constructor(
        private readonly subscriberService: SubscriberService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, subscriberService, journalService)
    }

    @Get()
    @ApiSearchQuery(SearchLogic, SubscriberSearchDto)
    @ApiPaginatedResponse(SubscriberResponseDto)
    async readAll(
        @Req() req: Request,
        @Query(new ValidationPipe()) _query: SubscriberQueryDto,
    ): Promise<[SubscriberResponseDto[], number]> {
        this.log.debug({message: 'fetch all subscribers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [subscribers, totalCount] = await this.subscriberService.readAll(sr)
        const responseList = subscribers.map(s => new SubscriberResponseDto(s, sr.user.role, {url: req.url}))
        if (sr.query.expand) {
            const searchDtoKeys = Object.keys(new SubscriberSearchDto())
            await this.expander.expandObjects(responseList, searchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<SubscriberResponseDto> {
        this.log.debug({message: 'fetch subscriber by id', id, func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = new SubscriberResponseDto(
            await this.subscriberService.read(id, sr),
            sr.user.role,
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const searchDtoKeys = Object.keys(new SubscriberSearchDto())
            await this.expander.expandObjects([response], searchDtoKeys, sr)
        }
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch subscriber journal by id', id, func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
