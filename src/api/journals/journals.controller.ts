import {RbacRole} from '../../config/constants.config'
import {JournalResponseDto} from './dto/journal-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Controller, Get, Logger, Param, ParseIntPipe, Req} from '@nestjs/common'
import {AppService} from '../../app.service'
import {JournalsService} from './journals.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandHelper} from '../../helpers/expand.helper'
import {JournalSearchDto} from './dto/journal-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {Request} from 'express'

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
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch all journals', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [journals, totalCount] =
            await this.journalsService.readAll(sr)
        const responseList = journals.map(j => new JournalResponseDto(j))
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
        @Param('resource_name') resourceName: string,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch journals by resource name', func: this.readByResource.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [journals, totalCount] =
            await this.journalsService.readAll(sr, resourceName)
        const responseList = journals.map(j => new JournalResponseDto(j))
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
        @Param('resource_name') resourceName: string,
        @Param('id', ParseIntPipe) resourceId: number,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch journals by resource name and id', func: this.readByResourceAndId.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [journals, totalCount] =
            await this.journalsService.readAll(sr, resourceName, resourceId)
        const responseList = journals.map(j => new JournalResponseDto(j))
        if (req.query.expand && !req.isRedirected) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    protected newServiceRequest(req: Request): ServiceRequest {
        return {
            headers: [req.rawHeaders],
            params: [req.params],
            user: req.user,
            query: req.query,
        }
    }
}
