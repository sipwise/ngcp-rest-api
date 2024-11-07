import {Controller, Get, Param, ParseIntPipe, Req, ValidationPipe} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PbxGroupMemberRequestParamDto} from './dto/pbx-group-member-request-param.dto'
import {PbxGroupMemberResponseDto} from './dto/pbx-group-member-response.dto'
import {PbxGroupMemberService} from './pbx-group-member.service'

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
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: PbxGroupMemberRequestParamDto,
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
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: PbxGroupMemberRequestParamDto,
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
