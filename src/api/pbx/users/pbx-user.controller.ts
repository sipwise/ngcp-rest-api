import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'

import {PbxUserResponseDto} from './dto/pbx-user-response.dto'
import {PbxUserService} from './pbx-user.service'

import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'pbx/users'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
)
@ApiTags('Pbx')
@Controller(resourceName)
@License(LicenseType.pbx)
export class PbxUserController extends CrudController<never, PbxUserResponseDto> {
    private readonly log = new LoggerService(PbxUserController.name)

    constructor(
        private readonly pbxUserService: PbxUserService,
    ) {
        super(resourceName, pbxUserService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PbxUserResponseDto)
    async readAll(@Req() req): Promise<[PbxUserResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx users',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        const [pbxUsers, totalCount] =
            await this.pbxUserService.readAll(sr)

        const responseList = pbxUsers.map((pbxUser) => new PbxUserResponseDto(pbxUser))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: PbxUserResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<PbxUserResponseDto> {
        this.log.debug({
            message: 'fetch pbx user by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const pbxUser = await this.pbxUserService.read(id, sr)
        return new PbxUserResponseDto(pbxUser)
    }
}
