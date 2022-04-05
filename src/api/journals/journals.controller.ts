import {RBAC_ROLES} from '../../config/constants.config'
import {JournalResponseDto} from './dto/journal-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, Req} from '@nestjs/common'
import {AppService} from '../../app.service'
import {JournalsService} from './journals.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandHelper} from '../../helpers/expand.helper'
import {JournalSearchDto} from './dto/journal-search.dto'

@Auth(RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.reseller)
@ApiTags('Journals')
@Controller('journals')
export class JournalsController {
    constructor(
        private readonly app: AppService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
    }

    @Get()
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async findAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe,
        ) row: number,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query,
        }
        const [responseList, totalCount] =
            await this.journalsService.readAll(sr, page, row)
        if (req.query.expand) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':resource_name')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async findResource(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe,
        ) row: number,
        @Param('resource_name') resourceName: string,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query,
        }
        const [responseList, totalCount] =
            await this.journalsService.readAll(sr, page, row, resourceName)
        if (req.query.expand && !req.isRedirected) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':resource_name/:id')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async findResourceID(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe,
        ) row: number,
        @Param('resource_name') resourceName: string,
        @Param('id', ParseIntPipe) resourceId: number,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query,
        }
        const [responseList, totalCount] =
            await this.journalsService.readAll(sr, page, row, resourceName, resourceId)
        if (req.query.expand && !req.isRedirected) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }
}
