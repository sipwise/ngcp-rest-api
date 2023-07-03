import {
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {AdminRequestDto} from './dto/admin-request.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminSearchDto} from './dto/admin-search.dto'
import {AdminService} from './admin.service'
import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {ApiPutBody} from '../../decorators/api-put-body.decorator'
import {AppService} from '../../app.service'
import {Auth} from '../../decorators/auth.decorator'
import {CrudController} from '../../controllers/crud.controller'
import {Dictionary} from '../../helpers/dictionary.helper'
import {ExpandHelper} from '../../helpers/expand.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {LoggerService} from '../../logger/logger.service'
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {PaginatedDto} from '../../dto/paginated.dto'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'
import {ParseIdDictionary} from '../../pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '../../pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'
import {PatchDto} from '../../dto/patch.dto'
import {RbacRole} from '../../config/constants.config'
import {Request} from 'express'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {number} from 'yargs'
import {ParsePatchPipe} from '../../pipes/parse-patch.pipe'

const resourceName = 'admins'

@ApiTags('Admin')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller)
export class AdminController extends CrudController<AdminRequestDto, AdminResponseDto> {
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
    @ApiBody({
        type: AdminRequestDto,
        isArray: true,
        required: true,
    })
    @ApiCreatedResponse(AdminResponseDto)
    async create(
        @Body(new ParseOneOrManyPipe({items: AdminRequestDto})) createDto: AdminRequestDto[],
        @Req() req: Request,
    ): Promise<AdminResponseDto[]> {
        this.log.debug({
            message: 'create admin bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const admins = createDto.map(admin => admin.toInternal())
        const created = await this.adminService.create(admins, sr)
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
        @Body() update: AdminRequestDto,
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, url: req.url, method: req.method})
        const admin = Object.assign(new AdminRequestDto(), update)
        const sr = new ServiceRequest(req)
        this.log.debug({message: 'put mode legacy', enabled: this.app.config.legacy.put})
        let response: AdminResponseDto
        if (this.app.config.legacy.put) {
            const update = new Dictionary<internal.Admin>()
            update[id] = admin.toInternal(false, id)
            const ids = await this.adminService.update(update, sr)
            const updateAdmin = await this.adminService.read(ids[0], sr)
            response = new AdminResponseDto(updateAdmin, sr.user.role)
        }
        const updateAdmin = await this.adminService.updateOrCreate(id, await admin.toInternal(true, id), sr)
        response = new AdminResponseDto(updateAdmin, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(AdminRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: AdminRequestDto})) updates: Dictionary<AdminRequestDto>,
        @Req() req,
    ) {
        this.log.debug({message: 'update admin bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const admins = new Dictionary<internal.Admin>()
        for (const id of Object.keys(updates)) {
            const dto: AdminRequestDto = updates[id]
            admins[id] = dto.toInternal(true, parseInt(id))
        }
        return await this.adminService.update(admins, sr)
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
        @Body(new ParsePatchPipe()) patch: PatchOperation[],
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'patch admin by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<PatchOperation[]>()

        updates[id] = patch

        const ids = await this.adminService.adjust(updates, sr)
        const response = new AdminResponseDto(await this.adminService.read(ids[0], sr), sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) updates: Dictionary<PatchOperation[]>,
        @Req() req,
    ) {
        const sr = new ServiceRequest(req)
        return await this.adminService.adjust(updates, sr)
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        this.log.debug({message: 'delete admin by id', func: this.delete.name, url: req.url, method: req.method})
        const deletedIds = await this.adminService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
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
