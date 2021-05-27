import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {ApiCreatedResponse, ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {AdminsService} from "./admins.service";
import {CreateAdminDto} from "./dto/create-admin.dto";
import {UpdateAdminDto} from "./dto/update-admin.dto";
import {Admin} from "./admin.entity";
import {OmniGuard} from "../../core/guards/omni.guard";
import {JournalingInterceptor} from "../../core/interceptors/journaling.interceptor";
import {JOURNAL_SERVICE} from "../../core/constants";
import {JournalService} from "../journal/journal.service";
import {LoggingInterceptor} from "../../core/interceptors/logging.interceptor";
import {config} from '../../config/main';

@ApiTags('admins')
@Controller('admins')
// TODO: We could create a custom decorator that combines OmniGuard, Logging- and JournalingInterceptor?
@UseGuards(OmniGuard)
@UseInterceptors(LoggingInterceptor, JournalingInterceptor)
export class AdminsController {
    constructor(
        private readonly adminsService: AdminsService,
        // private readonly logging: LoggingService,
        @Inject(JOURNAL_SERVICE) private readonly journalService: JournalService,
    ) {
    }

    @Post()
    @ApiCreatedResponse({
        type: Admin,
    })
    async create(@Body() admin: CreateAdminDto) {
        return await this.adminsService.create(admin);
    }

    @Get()
    @ApiOkResponse()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${config.common.api_default_query_page}`;
        row = row ? row : `${config.common.api_default_query_rows}`;
        return await this.adminsService.findAll(page, row);
    }

    @Get(':id')
    @ApiOkResponse()
    async findOne(@Param('id') id: string) {
        return await this.adminsService.findOne(+id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() admin: UpdateAdminDto) {
        return await this.adminsService.update(+id, admin);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.adminsService.remove(+id);
    }

    @Get(':id/journal')
    async journal(
        @Param('id') id: string,
        @Query('page') page: string,
        @Query('rows') row: string
    ) {
        page = page ? page : `${config.common.api_default_query_page}`;
        row = row ? row : `${config.common.api_default_query_rows}`;
        return this.journalService.findAll(page, row, 'admins', id)
    }
}
