import {Controller, Get, Inject, Param, Query, UseGuards} from "@nestjs/common";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {OmniGuard} from "../../core/guards/omni.guard";
import {JournalService} from "./journal.service";

@ApiTags('journals')
@Controller('journals')
@UseGuards(OmniGuard)
export class JournalController {
    constructor(
        @Inject("JOURNAL_SERVICE") private readonly journalService: JournalService,
    ) {}

    @Get(':resource_name')
    @ApiOkResponse()
    async findResource(
        @Query('page') page: string,
        @Query('rows') row: string,
        @Param('resource_name') resourceName: string
    ) {
        page = page ? page : `${process.env.API_DEFAULT_QUERY_PAGE}`;
        row = row ? row : `${process.env.API_DEFAULT_QUERY_ROWS}`;
        return await this.journalService.findAll(page, row, resourceName);
    }

    @Get(':resource_name/:id')
    @ApiOkResponse()
    async findResourceID(
        @Query('page') page: string,
        @Query('rows') row: string,
        @Param('resource_name') resourceName: string,
        @Param('id') resourceId: string
    ) {
        page = page ? page : `${process.env.API_DEFAULT_QUERY_PAGE}`;
        row = row ? row : `${process.env.API_DEFAULT_QUERY_ROWS}`;
        return await this.journalService.findAll(page, row, resourceName, resourceId);
    }

    @Get(':id')
    @ApiOkResponse()
    async findOne(@Param('id') id: string) {
        return await this.journalService.findOne(+id);
    }
}
