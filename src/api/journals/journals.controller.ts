import {Controller, Get, Inject, Param, Query, UseGuards} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {OmniGuard} from '../../guards/omni.guard'
import {JournalsService} from './journals.service'
import {config} from '../../config/main.config'

@ApiTags('journals')
@Controller('journals')
@UseGuards(OmniGuard)
export class JournalsController {
    constructor(
        @Inject('JOURNAL_SERVICE') private readonly journalsService: JournalsService,
    ) {
    }

    @Get()
    @ApiOkResponse()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.journalsService.findAll(page, row)
    }

    @Get(':resource_name')
    @ApiOkResponse()
    async findResource(
        @Query('page') page: string,
        @Query('rows') row: string,
        @Param('resource_name') resourceName: string,
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.journalsService.findAll(page, row, resourceName)
    }

    @Get(':resource_name/:id')
    @ApiOkResponse()
    async findResourceID(
        @Query('page') page: string,
        @Query('rows') row: string,
        @Param('resource_name') resourceName: string,
        @Param('id') resourceId: string,
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.journalsService.findAll(page, row, resourceName, resourceId)
    }
}