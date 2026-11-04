import {Controller, Get, Param, Req} from '@nestjs/common'
import {ApiOkResponse, ApiParam, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {JournalResponseDto} from './dto/journal-response.dto'
import {JournalSearchDto} from './dto/journal-search.dto'
import {JournalService} from './journal.service'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
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
    @ApiSearchQuery(SearchLogic, JournalSearchDto)
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

    @Get('*resource')
    @ApiParam({
        name: 'resource',
        description: 'Resource name, optionally followed by a resource id (`customers`, `customers/phonebook/23`), ' +
            'or a journal id',
    })
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async readByResource(
        @Param('resource') resource: string[],
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch journals by resource name', func: this.readByResource.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        // swagger ui sends the parameter with encoded slashes, as one segment
        const segments = resource.flatMap(segment => segment.split('/')).filter(segment => segment)
        const resourceId = segments.length > 1 && /^\d+$/.test(segments.at(-1)) ? +segments.pop() : undefined
        const [journals, totalCount] =
            await this.journalService.readAll(sr, segments.join('/'), resourceId)
        const responseList = journals.map(j => new JournalResponseDto(j))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const journalSearchDtoKeys = Object.keys(new JournalSearchDto())
            await this.expander.expandObjects(responseList, journalSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }
}
