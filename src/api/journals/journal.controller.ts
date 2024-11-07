import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {JournalResponseDto} from './dto/journal-response.dto'
import {JournalSearchDto} from './dto/journal-search.dto'
import {JournalService} from './journal.service'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('Journal')
@Controller('journals')
export class JournalController {
    private readonly log = new LoggerService(JournalController.name)

    constructor(
        private readonly app: AppService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(JournalResponseDto)
    async readAll(
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch all journals', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [journals, totalCount] =
            await this.journalService.readAll(sr)
        const responseList = journals.map(j => new JournalResponseDto(j))
        if (sr.query.expand) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':resource_name')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async readByResource(
        @Param('resource_name') resourceName: string,
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch journals by resource name', func: this.readByResource.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [journals, totalCount] =
            await this.journalService.readAll(sr, resourceName)
        const responseList = journals.map(j => new JournalResponseDto(j))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':resource_name/:id')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async readByResourceAndId(
        @Param('resource_name') resourceName: string,
        @Param('id', ParseIntPipe) resourceId: number,
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch journals by resource name and id', func: this.readByResourceAndId.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [journals, totalCount] =
            await this.journalService.readAll(sr, resourceName, resourceId)
        const responseList = journals.map(j => new JournalResponseDto(j))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }
}
