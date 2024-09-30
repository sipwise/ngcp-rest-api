import {Controller, Get, Param, ParseIntPipe, Req, ValidationPipe} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {PbxGroupMemberService} from './pbx-group-member.service'
import {CrudController} from '../../../../controllers/crud.controller'
import {Auth} from '../../../../decorators/auth.decorator'
import {SearchLogic} from '../../../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../../../logger/logger.service'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {PbxGroupMemberRequestParamDto} from './dto/pbx-group-member-request-param.dto'
import {AdminResponseDto} from '../../../admins/dto/admin-response.dto'
import {PbxGroupMemberResponseDto} from './dto/pbx-group-member-response.dto'
import {License as LicenseType, RbacRole} from '../../../../config/constants.config'
import {License} from '../../../../decorators/license.decorator'

const resourceName = 'pbx/groups'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.subscriber
)
@ApiTags('Pbx')
@Controller(resourceName)
@License(LicenseType.pbx)
export class PbxGroupMemberController extends CrudController<never, PbxGroupMemberResponseDto> {
    private readonly log = new LoggerService(PbxGroupMemberController.name)

    constructor(
        private readonly pbxGroupMemberService: PbxGroupMemberService,
    ) {
        super(resourceName, pbxGroupMemberService)
    }

    @Get(':groupId?/members')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PbxGroupMemberResponseDto)
    async readAll(
        @Req() req,
        @Param(new ValidationPipe()) reqParams: PbxGroupMemberRequestParamDto,
    ): Promise<[PbxGroupMemberResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx group members',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        const [pbxGroups, totalCount] =
            await this.pbxGroupMemberService.readAll(sr)

        const responseList = pbxGroups.map((group) => new PbxGroupMemberResponseDto(group))
        return [responseList, totalCount]
    }

    @Get(':groupId?/members/:id')
    @ApiOkResponse({
        type: AdminResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req,
        @Param(new ValidationPipe()) reqParams: PbxGroupMemberRequestParamDto,
    ): Promise<PbxGroupMemberResponseDto> {
        this.log.debug({
            message: 'fetch pbx group member by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const group = await this.pbxGroupMemberService.read(id, sr)

        return new PbxGroupMemberResponseDto(group)
    }
}
