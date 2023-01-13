import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    Param,
    ParseArrayPipe,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminService} from './admin.service'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {AppService} from '../../app.service'
import {Auth} from '../../decorators/auth.decorator'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {RbacRole} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'
import {Request} from 'express'
import {CrudController} from '../../controllers/crud.controller'
import {AdminSearchDto} from './dto/admin-search.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'admins'

@ApiTags('Admin')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller)
export class AdminController extends CrudController<AdminCreateDto, AdminResponseDto> {
    private readonly log = new LoggerService(AdminController.name)

    constructor(
        private readonly app: AppService,
        private readonly adminService: AdminService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, adminService, journalService)
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
        const sr = new ServiceRequest(req)
        const admin = Object.assign(new AdminCreateDto(), create)
        const newAdmin = await this.adminService.create(await admin.toInternal(), sr)
        const response = new AdminResponseDto(newAdmin, sr.user.role)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Post('bulk')
    @ApiCreatedResponse({
        type: [AdminResponseDto],
    })
    async createMany(
        @Body(new ParseArrayPipe({items: AdminCreateDto})) createDto: AdminCreateDto[],
        @Req() req: Request,
    ): Promise<AdminResponseDto[]> {
        this.log.debug({
            message: 'create admin bulk',
            func: this.createMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const admins = createDto.map(admin => admin.toInternal())
        const created = await this.adminService.createMany(admins, sr)
        return created.map((adm) => new AdminResponseDto(adm, sr.user.role))
    }

    @Get()
    @Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.ccareadmin, RbacRole.ccare)
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
        const sr = new ServiceRequest(req)
        const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        const [admins, totalCount] =
            await this.adminService.readAll(sr)
        const responseList = admins.map((adm) => new AdminResponseDto(adm, sr.user.role))
        if (req.query.expand) {
            await this.expander.expandObjects(responseList, adminSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.ccareadmin, RbacRole.ccare)
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
        const sr = new ServiceRequest(req)
        const admin = await this.adminService.read(id, sr)
        const responseItem = new AdminResponseDto(admin, sr.user.role)
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
        @Body() update: AdminCreateDto,
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, url: req.url, method: req.method})
        const admin = Object.assign(new AdminCreateDto(), update)
        const sr = new ServiceRequest(req)
        this.log.debug({message: 'put mode legacy', enabled: this.app.config.legacy.put})
        let response: AdminResponseDto
        if (this.app.config.legacy.put) {
            const updateAdmin = await this.adminService.update(id, await admin.toInternal(false), sr)
            response = new AdminResponseDto(updateAdmin, sr.user.role)
        }
        const updateAdmin = await this.adminService.updateOrCreate(id, await admin.toInternal(), sr)
        response = new AdminResponseDto(updateAdmin, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
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
        const sr = new ServiceRequest(req)
        const response = new AdminResponseDto(await this.adminService.adjust(id, patch, sr), sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response

    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<number> {
        const sr = new ServiceRequest(req)
        this.log.debug({message: 'delete admin by id', func: this.delete.name, url: req.url, method: req.method})
        const response = await this.adminService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(
        @Param('id') id: number | string,
        @Req() req,
    ) {
        const [journals, count] = await this.journalService.readAll(new ServiceRequest(req), 'admins', id)
        const responseList = journals.map(j => new JournalResponseDto(j))
        return [responseList, count]
    }
}
