import {BadRequestException, Body, Controller, Delete, Get, Inject, Logger, Param, Post, Put, Patch, Query, Request} from '@nestjs/common'
import {ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {AdminsService} from './admins.service'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {JOURNAL_SERVICE, RBAC_ROLES} from '../../config/constants.config'
import {JournalsService} from '../journals/journals.service'
import {config} from '../../config/main.config'
import {AdminResponseDto} from './dto/admin-response.dto'
import {Auth} from "../../decorators/auth.decorator";
import {validate, Operation as PatchOperation} from 'fast-json-patch'

@ApiTags('admins')
@Controller('admins')
export class AdminsController {
    private logger = new Logger(AdminsController.name)

    constructor(
        private readonly adminsService: AdminsService,
        @Inject(JOURNAL_SERVICE) private readonly journalsService: JournalsService,
    ) {
    }

    @Post()
    @ApiCreatedResponse({
        type: AdminResponseDto,
    })
    async create(@Body() admin: AdminCreateDto, @Request() r) {
        return await this.adminsService.create(admin)
    }

    @Get()
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findAll(@Query('page') page: string, @Query('rows') row: string, @Request() req) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.adminsService.readAll(page, row)
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findOne(@Param('id') id: string) {
        return await this.adminsService.read(+id)
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() admin: AdminUpdateDto) {
        return await this.adminsService.update(+id, admin)
    }

    @Patch(':id')
    async adjust(@Param('id') id: string, @Body() patch: PatchOperation[]) {
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g,' ').replace(/\"/g, "'")
            throw new BadRequestException(message)
        }
        return await this.adminsService.adjust(+id, patch)
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.adminsService.delete(+id)
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
