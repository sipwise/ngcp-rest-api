import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PeeringResponseDto} from './dto/peering-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
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
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(PeeringResponseDto)
    async readAll(@Req() req: Request): Promise<[PeeringResponseDto[], number]> {
        this.log.debug({
            message: 'read all peerings',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new PeeringResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<PeeringResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
