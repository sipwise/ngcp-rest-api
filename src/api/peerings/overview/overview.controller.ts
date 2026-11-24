import {Controller, Get, Req} from '@nestjs/common'
import {ApiOperation, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PeeringOverviewResponseDto} from './dto/overview-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'peerings/overview'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Peering')
@Controller(resourceName)
export class PeeringOverviewController extends CrudController<never, PeeringOverviewResponseDto> {
    private readonly log = new LoggerService(PeeringOverviewController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiOperation({summary: 'List links to the peering overview resources'})
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(PeeringOverviewResponseDto)
    readAll(@Req() req: Request): Promise<[PeeringOverviewResponseDto[], number]> {
        this.log.debug({
            message: 'read peering overview',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new PeeringOverviewResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<PeeringOverviewResponseDto>(response, sr, 'resourceUrl')
        return Promise.resolve([sortedResponse, response.length])
    }
}
