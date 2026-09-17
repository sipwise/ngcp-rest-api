import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiParam, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PbxGroupMemberResponseDto} from './dto/member-response.dto'
import {PbxGroupMemberService} from './member.service'

import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdPipe} from '~/pipes/parse-int-id.pipe'

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

    @Get('{:groupId/}members')
    @ApiParam({name: 'groupId', required: false, type: Number})
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PbxGroupMemberResponseDto)
    async readAll(
        @Req() req: Request,
        @Param('groupId', new ParseIntIdPipe({allowUndefined: true})) _groupId: number,
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

    @Get('{:groupId/}members/:id')
    @ApiParam({name: 'groupId', required: false, type: Number})
    @ApiOkResponse({
        type: PbxGroupMemberResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param('groupId', new ParseIntIdPipe({allowUndefined: true})) _groupId: number,
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
