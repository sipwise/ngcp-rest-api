import {
    BadRequestException,
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseInterceptors,
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
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'
import {Request} from 'express'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'

@ApiTags('Admins')
@Controller('admins')
@UseInterceptors(new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller)
export class AdminsController {
    private readonly log = new Logger(AdminsController.name)

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
    async create(@Body() admin: AdminCreateDto, @Req() req): Promise<AdminResponseDto> {
        this.log.debug({message: 'create admin', func: this.create.name, url: req.url, method: req.method})
        return await this.adminsService.create(admin, req)
    }

    @Get()
    @ApiOkResponse({
        type: [AdminResponseDto],
    })
    async findAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) rows: number,
        @Req() req,
    ): Promise<AdminResponseDto[]> {
        this.log.debug({message: 'fetch all admins', func: this.findAll.name, url: req.url, method: req.method})
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query,
        }
        return await this.adminsService.readAll(page, rows, sr)
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async findOne(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<AdminResponseDto> {
        this.log.debug({message: 'fetch admin by id', func: this.findOne.name, url: req.url, method: req.method})
        return await this.adminsService.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() admin: AdminUpdateDto,
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, url: req.url, method: req.method})
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return await this.adminsService.update(id, admin, sr)
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
        @Body() patch: PatchOperation | PatchOperation[],
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'patch admin by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.adminsService.adjust(id, patch, sr)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.remove.name, url: req.url, method: req.method})
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return await this.adminsService.delete(id, sr)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(
        @Param('id', ParseIntPipe) id: number,
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) row: number,
        @Req() req: Request,
    ): Promise<JournalResponseDto[]> {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return this.journalsService.readAll(sr, page, row, 'admins', id)
    }
}
