import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'

import {PbxGroupResponseDto} from './dto/pbx-group-response.dto'
import {PbxGroupService} from './pbx-group.service'

import {AdminResponseDto} from '~/api/admins/dto/admin-response.dto'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'pbx/groups'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.subscriber,
)
@ApiTags('Pbx')
@Controller(resourceName)
@License(LicenseType.pbx)
export class PbxGroupController extends CrudController<never, PbxGroupResponseDto> {
    private readonly log = new LoggerService(PbxGroupController.name)

    constructor(
        private readonly pbxGroupService: PbxGroupService,
    ) {
        super(resourceName, pbxGroupService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PbxGroupResponseDto)
    async readAll(@Req() req): Promise<[PbxGroupResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx groups',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        const [pbxGroups, totalCount] =
            await this.pbxGroupService.readAll(sr)

        const responseList = pbxGroups.map((group) => new PbxGroupResponseDto(req.url, group))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<PbxGroupResponseDto> {
        this.log.debug({
            message: 'fetch pbx group by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const group = await this.pbxGroupService.read(id, sr)

        const url = req.url.split('/').slice(0, -1).join('/')
        return new PbxGroupResponseDto(url, group)
    }
}
