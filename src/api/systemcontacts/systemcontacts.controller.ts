import {Controller, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactsService} from './systemcontacts.service'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {number} from 'yargs'
import {ExpandHelper} from '../../helpers/expand.helper'
import {SystemcontactSearchDto} from './dto/systemcontact-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'systemcontacts'

@Auth(RbacRole.system, RbacRole.admin)
@ApiTags('System Contacts')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class SystemcontactsController extends CrudController<SystemcontactCreateDto, SystemcontactResponseDto> {
    private readonly log = new Logger(SystemcontactsController.name)

    constructor(
        private readonly contactsService: SystemcontactsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: SystemcontactResponseDto,
    })
    async create(entity: SystemcontactCreateDto, req): Promise<SystemcontactResponseDto> {
        this.log.debug({message: 'create system contact', func: this.create.name, url: req.url, method: req.method})
        return this.contactsService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(SystemcontactResponseDto)
    async readAll(@Req() req): Promise<[SystemcontactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all system contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.contactsService.readAll(sr)
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new SystemcontactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<SystemcontactResponseDto> {
        this.log.debug({message: 'fetch system contact by id', func: this.read.name, url: req.url, method: req.method})
        const responseItem = await this.contactsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new SystemcontactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: SystemcontactCreateDto, req): Promise<SystemcontactResponseDto> {
        this.log.debug({message: 'update system contact by id', func: this.update.name, url: req.url, method: req.method})
        return this.contactsService.update(id, entity, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<SystemcontactResponseDto> {
        this.log.debug({message: 'patch system contact by id', func: this.adjust.name, url: req.url, method: req.method})
        return this.contactsService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete system contact by id', func: this.delete.name, url: req.url, method: req.method})
        return this.contactsService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({message: 'fetch system contact journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
