import {
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
} from '@nestjs/common'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactsService} from './systemcontacts.service'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {number} from 'yargs'
import {AppService} from '../../app.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {SystemcontactSearchDto} from './dto/systemcontact-search.dto'

const resourceName = 'systemcontacts'

@ApiTags('System Contacts')
@Controller(resourceName)
@Auth(RBAC_ROLES.system, RBAC_ROLES.admin)
export class SystemcontactsController extends CrudController<SystemcontactCreateDto, SystemcontactResponseDto> {
    private readonly log = new Logger(SystemcontactsController.name)

    constructor(
        private readonly contactsService: SystemcontactsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: SystemcontactResponseDto,
    })
    async create(entity: SystemcontactCreateDto, req): Promise<SystemcontactResponseDto> {
        return this.contactsService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiOkResponse({
        type: SystemcontactResponseDto,
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
    ): Promise<SystemcontactResponseDto[]> {
        this.log.debug({
            message: 'fetch all system contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const responseList = await this.contactsService.readAll(page, rows, this.newServiceRequest(req))
        if (req.query.expand) {
            let contactSearchDtoKeys = Object.keys(new SystemcontactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, req)
        }
        return responseList
    }

    @Get(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<SystemcontactResponseDto> {
        return this.contactsService.read(id, this.newServiceRequest(req))
        const responseItem = await this.contactsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            let contactSearchDtoKeys = Object.keys(new SystemcontactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: SystemcontactCreateDto, req): Promise<SystemcontactResponseDto> {
        return this.contactsService.update(id, entity, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<SystemcontactResponseDto> {
        return this.contactsService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        return this.contactsService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }
}
