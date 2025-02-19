import {Controller, Delete, Get, Inject, Param, ParseIntPipe, Req, forwardRef} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {BanSubscriberService} from './ban-subscriber.service'
import {BanSubscriberSearchDto} from './dto/ban-subscriber-search.dto'

import {BanSubscriberResponseDto} from '~/api/bans/subscribers/dto/ban-subscriber-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'

const resourceName = 'bans/subscribers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.lintercept,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
)
@ApiTags('Bans')
@Controller(resourceName)
export class BanSubscriberController extends CrudController<never, BanSubscriberResponseDto> {
    private readonly log = new LoggerService(BanSubscriberController.name)

    constructor(
        private readonly banSubscriberService: BanSubscriberService,
        @Inject(forwardRef(() => ExpandHelper)) private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(BanSubscriberResponseDto)
    async readAll(@Req() req): Promise<[BanSubscriberResponseDto[], number]> {
        this.log.debug({
            message: 'read all banned admins',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] = await this.banSubscriberService.readAll(sr)
        const responseList = entity.map(e => new BanSubscriberResponseDto(e))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new BanSubscriberSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }

        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: BanSubscriberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<BanSubscriberResponseDto> {
        this.log.debug({
            message: 'read banned admin by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new BanSubscriberResponseDto(await this.banSubscriberService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new BanSubscriberSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'remove ban for subscriber by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.banSubscriberService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }
}
