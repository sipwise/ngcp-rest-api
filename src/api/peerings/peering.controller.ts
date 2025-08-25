import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'

import {PeeringResponseDto} from './dto/peering-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'peerings'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Peering')
@Controller(resourceName)
export class PeeringController extends CrudController<never, PeeringResponseDto> {
    private readonly log = new LoggerService(PeeringController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(PeeringResponseDto)
    async readAll(@Req() req): Promise<[PeeringResponseDto[], number]> {
        this.log.debug({
            message: 'read all peerings',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const response = [new PeeringResponseDto({url: req.url})]
        return [response, 1]
    }
}
