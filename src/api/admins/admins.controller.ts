import {
    BadRequestException,
    Body,
    Controller,
    DefaultValuePipe,
    Delete, forwardRef,
    Get, Inject,
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
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiHeader,
    ApiOkResponse,
    ApiProperty, ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
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
import {AdminSearchDto} from './dto/admin-search.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'

const resourceName = 'admins'

@ApiTags('Admins')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
@UseInterceptors(new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller)
export class AdminsController extends CrudController<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsController.name)

    constructor(
        private readonly app: AppService,
        private readonly adminsService: AdminsService,
        private readonly journalsService: JournalsService,
        // @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, adminsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: AdminResponseDto,
    })
    async create(@Body() create: AdminCreateDto, @Req() req): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'create admin',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const admin = Object.assign(new AdminCreateDto(), create)
        const newAdmin = await this.adminsService.create(await admin.toInternal(), this.newServiceRequest(req))
        const response = new AdminResponseDto(newAdmin)
        return response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(AdminResponseDto)
    async readAll(@Req() req: Request): Promise<[AdminResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all admins',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })
        const sr = this.newServiceRequest(req)
        const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        const [admins, totalCount] =
            await this.adminsService.readAll(sr)
        const responseList = admins.map((adm) => new AdminResponseDto(adm))
        if (req.query.expand) {
            await this.expander.expandObjects(responseList, adminSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
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
        const admin = await this.adminsService.read(id, this.newServiceRequest(req))
        const responseItem = new AdminResponseDto(admin)
        if (req.query.expand && !req.isRedirected) {
            const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
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
        @Body() update: AdminUpdateDto,
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, url: req.url, method: req.method})
        const admin = Object.assign(new AdminUpdateDto(), update)
        return new AdminResponseDto(await this.adminsService.update(id, await admin.toInternal(), this.newServiceRequest(req)))
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
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
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        return new AdminResponseDto(await this.adminsService.adjust(id, patch, this.newServiceRequest(req)))
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
    ): Promise<[JournalResponseDto[], number]> {
        return this.journalsService.readAll(this.newServiceRequest(req), page, row, 'admins', id)
    }
}
