import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseInterceptors,
} from '@nestjs/common'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminsService} from './admins.service'
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
import {JournalsService} from '../journals/journals.service'
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

const resourceName = 'admins'

@ApiTags('Admins')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller)
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
        const sr = this.newServiceRequest(req)
        const admin = Object.assign(new AdminCreateDto(), create)
        const newAdmin = await this.adminsService.create(await admin.toInternal(), sr)
        const response = new AdminResponseDto(newAdmin, sr.user.role)
        await this.journalsService.writeJournal(sr, response.id, response)
        return response
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
        const sr = this.newServiceRequest(req)
        const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        const [admins, totalCount] =
            await this.adminsService.readAll(sr)
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
        const sr = this.newServiceRequest(req)
        const admin = await this.adminsService.read(id, sr)
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
        const sr = this.newServiceRequest(req)
        this.log.debug({message: 'put mode legacy', enabled: this.app.config.legacy.put})
        let response: AdminResponseDto
        if (this.app.config.legacy.put) {
            const updateAdmin = await this.adminsService.update(id, await admin.toInternal(false), sr)
            response = new AdminResponseDto(updateAdmin, sr.user.role)
        }
        const updateAdmin = await this.adminsService.updateOrCreate(id, await admin.toInternal(), sr)
        response = new AdminResponseDto(updateAdmin, sr.user.role)
        await this.journalsService.writeJournal(sr, id, response)
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
        const sr = this.newServiceRequest(req)
        const response = new AdminResponseDto(await this.adminsService.adjust(id, patch, sr), sr.user.role)
        await this.journalsService.writeJournal(sr, id, response)
        return response

    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<number> {
        const sr = this.newServiceRequest(req)
        this.log.debug({message: 'delete admin by id', func: this.delete.name, url: req.url, method: req.method})
        const response = await this.adminsService.delete(id, sr)
        await this.journalsService.writeJournal(sr, id, {})
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
        const [journals, count] = await this.journalsService.readAll(this.newServiceRequest(req), 'admins', id)
        const test = await this.journalsService.readAll(this.newServiceRequest(req), 'admins', id)
        const responseList = journals.map(j => new JournalResponseDto(j))
        return [responseList, count]
    }
}
