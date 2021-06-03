import {Controller, Get, Inject, Param, Query, UseGuards} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {OmniGuard} from '../../core/guards/omni.guard'
import {JournalService} from './journal.service'
import {config} from '../../config/main'

@ApiTags('journals')
@Controller('journals')
@UseGuards(OmniGuard)
export class JournalController {
    constructor(
        @Inject('JOURNAL_SERVICE') private readonly journalService: JournalService,
    ) {
    }

    @Get()
    @ApiOkResponse()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.journalService.findAll(page, row)
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
        return await this.journalService.findAll(page, row, resourceName)
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
        return await this.journalService.findAll(page, row, resourceName, resourceId)
    }
}
