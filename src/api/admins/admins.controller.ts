import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Request,
} from '@nestjs/common'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AdminsService} from './admins.service'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {AppService} from '../../app.service'
import {Auth} from '../../decorators/auth.decorator'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {Operation as PatchOperation, validate} from 'fast-json-patch'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'

@ApiTags('Admins')
@Controller('admins')
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller)
export class AdminsController {

    constructor(
        private readonly app: AppService,
        private readonly adminsService: AdminsService,
        private readonly journalsService: JournalsService,
    ) {
    }

    @Post()
    @ApiCreatedResponse({
        type: AdminResponseDto,
    })
    async create(@Body() admin: AdminCreateDto, @Request() r): Promise<AdminResponseDto> {
        return await this.adminsService.create(admin)
    }

    @Get()
    @ApiOkResponse({
        type: [AdminResponseDto],
    })
    async findAll(
        @Query('page', ParseIntPipe) page: number,
        @Query('rows', ParseIntPipe) row: number,
        @Request() req,
    ): Promise<AdminResponseDto[]> {
        page = page ? page : this.app.config.common.api_default_query_page
        row = row ? row : this.app.config.common.api_default_query_rows
        return await this.adminsService.readAll(page, row)
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<AdminResponseDto> {
        return await this.adminsService.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() admin: AdminUpdateDto,
    ): Promise<AdminResponseDto> {
        return await this.adminsService.update(+id, admin)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body() patch: PatchOperation[],
    ): Promise<AdminResponseDto> {
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.adminsService.adjust(id, patch)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<number> {
        return await this.adminsService.delete(id)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(
        @Param('id', ParseIntPipe) id: number,
        @Query('page', ParseIntPipe) page: number,
        @Query('rows', ParseIntPipe) row: number,
    ): Promise<JournalResponseDto[]> {
        page = page ? page : this.app.config.common.api_default_query_page
        row = row ? row : this.app.config.common.api_default_query_rows
        return this.journalsService.readAll(page, row, 'admins', id)
    }
}
