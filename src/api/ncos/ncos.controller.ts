import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {NCOSResponseDto} from './dto/ncos-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'ncos'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@Controller(resourceName)
export class NCOSController extends CrudController<never, NCOSResponseDto> {
    private readonly log = new LoggerService(NCOSController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(NCOSResponseDto)
    async readAll(@Req() req: Request): Promise<[NCOSResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new NCOSResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<NCOSResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
