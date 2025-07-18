import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    forwardRef,
} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {AdminService} from './admin.service'
import {AdminRequestDto} from './dto/admin-request.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminSearchDto} from './dto/admin-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'admins'

@ApiTags('Admin')
@Controller(resourceName)
@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
)
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
    @Transactional()
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
    @Auth(
        RbacRole.admin,
        RbacRole.system,
        RbacRole.reseller,
        RbacRole.ccareadmin,
        RbacRole.ccare,
    )
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
        if (sr.query.expand) {
            await this.expander.expandObjects(responseList, adminSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @Auth(
        RbacRole.admin,
        RbacRole.system,
        RbacRole.reseller,
        RbacRole.ccareadmin,
        RbacRole.ccare,
    )
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'fetch admin by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const admin = await this.adminService.read(id, sr)
        const responseItem = new AdminResponseDto(admin, sr.user.role)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
            await this.expander.expandObjects([responseItem], adminSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    @Transactional()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() update: AdminRequestDto,
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'update admin by id',
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Admin>()
        update[id] = Object.assign(new AdminRequestDto(), update).toInternal({setDefaults: false, id: id, assignNulls: true})
        const ids = await this.adminService.update(updates, sr)
        const updateAdmin = await this.adminService.read(ids[0], sr)
        const response = new AdminResponseDto(updateAdmin, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(AdminRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: AdminRequestDto})) updates: Dictionary<AdminRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update admin bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const admins = new Dictionary<internal.Admin>()
        for (const id of Object.keys(updates)) {
            const dto: AdminRequestDto = updates[id]
            admins[id] = dto.toInternal({setDefaults: true, id: parseInt(id), assignNulls: true})
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
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: PatchOperation[],
        @Req() req: Request,
    ): Promise<AdminResponseDto> {
        this.log.debug({message: 'patch admin by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.adminService.read(id, sr)
        const entity = await patchToEntity<internal.Admin, AdminRequestDto>(oldEntity, patch, AdminRequestDto)
        const update = new Dictionary<internal.Admin>(id.toString(), entity)

        const ids = await this.adminService.update(update, sr)
        const updatedEntity = await this.adminService.read(ids[0], sr)
        const response = new AdminResponseDto(updatedEntity, sr.user.role)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.Admin>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.adminService.read(+id, sr)
            const entity = await patchToEntity<internal.Admin, AdminRequestDto>(oldEntity, patches[id], AdminRequestDto)
            updates[id] = entity
        }

        return await this.adminService.update(updates, sr)
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
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
        @Req() req: Request,
    ): Promise<[JournalResponseDto[], number]> {
        const [journals, count] = await this.journalService.readAll(new ServiceRequest(req), 'admins', id)
        const responseList = journals.map(j => new JournalResponseDto(j))
        return [responseList, count]
    }
}
