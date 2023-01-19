import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {AdminResponseDto} from '../admins/dto/admin-response.dto'
import {PbxGroupResponseDto} from './dto/pbx-group-response.dto'
import {PbxGroupService} from './pbx-group.service'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {PaginatedDto} from '../../dto/paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'pbxgroups'

@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.subscriber)
@ApiTags('PbxGroup')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
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
        const responseList = pbxGroups.map((group) => new PbxGroupResponseDto(group))
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
        return new PbxGroupResponseDto(group)
    }
}
