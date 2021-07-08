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
    UseInterceptors,
} from '@nestjs/common'
import {ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {AdminsService} from './admins.service'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {OmniGuard} from '../../guards/omni.guard'
import {JOURNAL_SERVICE} from '../../config/constants.config'
import {JournalsService} from '../journals/journals.service'
import {config} from '../../config/main.config'
import {AdminResponseDto} from './dto/admin-response.dto'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'

@ApiTags('admins')
@Controller('admins')
// TODO: We could create a custom decorator that combines OmniGuard, Logger- and JournalingInterceptor?
@UseGuards(OmniGuard)
@UseInterceptors(LoggingInterceptor, JournalingInterceptor)
export class AdminsController {
    constructor(
        private readonly adminsService: AdminsService,
        // private readonly logger: LoggerService,
        @Inject(JOURNAL_SERVICE) private readonly journalsService: JournalsService,
    ) {
    }

    @Post()
    @ApiCreatedResponse({
        type: AdminResponseDto,
    })
    async create(@Body() admin: AdminCreateDto) {
        return await this.adminsService.create(admin)
    }

    @Get()
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.adminsService.findAll(page, row)
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findOne(@Param('id') id: string) {
        return await this.adminsService.findOne(+id)
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() admin: AdminUpdateDto) {
        return await this.adminsService.update(+id, admin)
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.adminsService.remove(+id)
    }

    @Get(':id/journal')
    async journal(
        @Param('id') id: string,
        @Query('page') page: string,
        @Query('rows') row: string,
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return this.journalsService.readAll(page, row, 'admins', id)
    }
}
