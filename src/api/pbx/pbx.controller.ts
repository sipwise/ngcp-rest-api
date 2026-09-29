import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PbxResponseDto} from './dto/pbx-response.dto'

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

const resourceName = 'pbx'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.subscriber,
)
@ApiTags('Pbx')
@Controller(resourceName)
@License(LicenseType.pbx)
export class PbxController extends CrudController<never, PbxResponseDto> {
    private readonly log = new LoggerService(PbxController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(PbxResponseDto)
    async readAll(@Req() req: Request): Promise<[PbxResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        const response = [new PbxResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<PbxResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
