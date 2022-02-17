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
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {CrudController} from '../../controllers/crud.controller'
import {ExpandHelper} from '../../helpers/expand.helper'
import {AdminSearchDto} from './dto/admin-search.dto'

const resourceName = 'admins'

@ApiTags('Admins')
@Controller(resourceName)
@UseInterceptors(new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller)
export class AdminsController extends CrudController<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsController.name)

    constructor(
        private readonly app: AppService,
        private readonly adminsService: AdminsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper
    ) {
        super(resourceName, adminsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: AdminResponseDto,
    })
    async create(@Body() admin: AdminCreateDto, @Req() req): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'create admin',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        return await this.adminsService.create(admin, this.newServiceRequest(req))
    }

    @Get()
    @ApiOkResponse({
        type: [AdminResponseDto],
    })
    async readAll(
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
        this.log.debug({
            message: 'fetch all admins',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })
        const responseList = await this.adminsService.readAll(page, rows, this.newServiceRequest(req))
        if (req.query.expand) {
            let adminSearchDtoKeys = Object.keys(new AdminSearchDto())
            await this.expander.expandObjects(responseList, adminSearchDtoKeys, req)
        }
        return responseList
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'fetch admin by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const responseItem = await this.adminsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            let adminSearchDtoKeys = Object.keys(new AdminSearchDto())
            await this.expander.expandObjects(responseItem, adminSearchDtoKeys, req)
        }
        return responseItem
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
        return await this.adminsService.update(id, admin, this.newServiceRequest(req))
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
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.adminsService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, url: req.url, method: req.method})
        return await this.adminsService.delete(id, this.newServiceRequest(req))
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
        return this.journalsService.readAll(this.newServiceRequest(req), page, row, 'admins', id)
    }
}
