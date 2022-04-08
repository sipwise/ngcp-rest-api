import {Controller, DefaultValuePipe, Get, Logger, Param, ParseIntPipe, Query, Req} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {AdminResponseDto} from '../admins/dto/admin-response.dto'
import {AppService} from '../../app.service'
import {PbxgroupsResponseDto} from './dto/pbxgroups-response.dto'
import {PbxgroupsService} from './pbxgroups.service'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'pbxgroups'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.subscriber)
@ApiTags('Pbx groups')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class PbxgroupsController extends CrudController<never, PbxgroupsResponseDto> {
    private readonly log: Logger = new Logger(PbxgroupsController.name)

    constructor(
        private readonly pbxgroupsService: PbxgroupsService,
    ) {
        super(resourceName, pbxgroupsService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PbxgroupsResponseDto)
    async readAll(@Req() req): Promise<[PbxgroupsResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx groups',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = this.newServiceRequest(req)
        const [pbxGroups, totalCount] =
            await this.pbxgroupsService.readAll(sr)
        const responseList = pbxGroups.map((group) => new PbxgroupsResponseDto(group))
        // if (req.query.expand) {
        //     const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        //     await this.expander.expandObjects(responseList, adminSearchDtoKeys, req)
        // }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<PbxgroupsResponseDto> {
        this.log.debug({
            message: 'fetch pbx group by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const group = await this.pbxgroupsService.read(id, this.newServiceRequest(req))
        const responseItem = new PbxgroupsResponseDto(group)
        // if (req.query.expand && !req.isRedirected) {
        //     const adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        //     await this.expander.expandObjects(responseItem, adminSearchDtoKeys, req)
        // }
        return responseItem
    }
}
