import {Controller, DefaultValuePipe, Get, Logger, Param, ParseIntPipe, Query, Req} from '@nestjs/common'
import {ApiOkResponse} from '@nestjs/swagger'
import {AdminResponseDto} from '../admins/dto/admin-response.dto'
import {AppService} from '../../app.service'
import {PbxgroupsResponseDto} from './dto/pbxgroups-response.dto'
import {PbxgroupsService} from './pbxgroups.service'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'

const resourceName = 'pbxgroups'

@Controller(resourceName)
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.subscriber)
export class PbxgroupsController extends CrudController<never, PbxgroupsResponseDto> {
    private readonly log: Logger = new Logger(PbxgroupsController.name)

    constructor(
        private readonly pbxgroupsService: PbxgroupsService,
    ) {
        super(resourceName, pbxgroupsService)
    }

    @Get()
    @ApiOkResponse({
        type: [PbxgroupsResponseDto],
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
    ): Promise<[PbxgroupsResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx groups',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const [pbxGroups, totalCount] =
            await this.pbxgroupsService.readAll(page, rows, this.newServiceRequest(req))
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
