import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {HeaderManipulationResponseDto} from './dto/header-manipulation-response.dto'

import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'header-manipulations'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('HeaderManipulation')
@Controller(resourceName)
@License(LicenseType.headerManipulation)
export class HeaderManipulationController extends CrudController<never, HeaderManipulationResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(HeaderManipulationResponseDto)
    async readAll(@Req() req: Request): Promise<[HeaderManipulationResponseDto[], number]> {
        this.log.debug({
            message: 'read all header manipulations',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new HeaderManipulationResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<HeaderManipulationResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
