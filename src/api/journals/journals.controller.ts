import {RbacRole} from '../../config/constants.config'
import {JournalResponseDto} from './dto/journal-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Controller, DefaultValuePipe, Get, Logger, Param, ParseIntPipe, Query, Req} from '@nestjs/common'
import {AppService} from '../../app.service'
import {JournalsService} from './journals.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandHelper} from '../../helpers/expand.helper'
import {JournalSearchDto} from './dto/journal-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.reseller)
@ApiTags('Journals')
@ApiExtraModels(PaginatedDto)
@Controller('journals')
export class JournalsController {
    private readonly log: Logger = new Logger(JournalsController.name)

    constructor(
        private readonly app: AppService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(JournalResponseDto)
    async readAll(
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
        this.log.debug({message: 'fetch all journals', func: this.readAll.name, url: req.url, method: req.method})
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
    async readByResource(
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
        this.log.debug({message: 'fetch journals by resource name', func: this.readByResource.name, url: req.url, method: req.method})
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
    async readByResourceAndId(
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
        this.log.debug({message: 'fetch journals by resource name and id', func: this.readByResourceAndId.name, url: req.url, method: req.method})
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
