import {RBAC_ROLES} from '../../config/constants.config'
import {JournalResponseDto} from './dto/journal-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query} from '@nestjs/common'
import {AppService} from '../../app.service'
import {JournalsService} from './journals.service'

@Auth(RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.reseller)
@ApiTags('Journals')
@Controller('journals')
export class JournalsController {
    constructor(
        private readonly app: AppService,
        private readonly journalsService: JournalsService,
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
    ): Promise<JournalResponseDto[]> {
        return await this.journalsService.readAll(page, row)
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
    ): Promise<JournalResponseDto[]> {
        return await this.journalsService.readAll(page, row, resourceName)
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
    ): Promise<JournalResponseDto[]> {
        return await this.journalsService.readAll(page, row, resourceName, resourceId)
    }
}
