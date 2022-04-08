import {
    Controller,
    DefaultValuePipe,
    Delete,
    forwardRef,
    Get,
    Inject,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactCreateDto} from './dto/customercontact-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {CustomercontactResponseDto} from './dto/customercontact-response.dto'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomercontactSearchDto} from './dto/customercontact-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {ContractResponseDto} from '../contracts/dto/contract-response.dto'

const resourceName = 'customercontacts'

@Auth(RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin, RBAC_ROLES.reseller)
@ApiTags('Customer Contacts')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomercontactsController extends CrudController<CustomercontactCreateDto, CustomercontactResponseDto> {
    private readonly log = new Logger(CustomercontactsController.name)

    constructor(
        private readonly contactsService: CustomercontactsService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomercontactResponseDto,
    })
    async create(entity: CustomercontactCreateDto, req: Request): Promise<CustomercontactResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomercontactResponseDto)
    async readAll(@Req() req): Promise<[CustomercontactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all customer contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.contactsService.readAll(sr)
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new CustomercontactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomercontactResponseDto> {
        const responseItem = await this.contactsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new CustomercontactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, req)
        }
        return responseItem
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomercontactResponseDto> {
        return this.contactsService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: CustomercontactCreateDto, req): Promise<CustomercontactResponseDto> {
        return this.contactsService.update(id, entity, this.newServiceRequest(req))
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
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        return super.journal(id, page, row, req)
    }

}
