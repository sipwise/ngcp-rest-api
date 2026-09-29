import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {RewriteRuleBaseResponseDto} from './dto/rewrite-rule-base-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'rewrite-rules'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('RewriteRule')
@Controller(resourceName)
export class RewriteRuleController extends CrudController<never, RewriteRuleBaseResponseDto> {
    private readonly log = new LoggerService(RewriteRuleController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(RewriteRuleBaseResponseDto)
    async readAll(@Req() req: Request): Promise<[RewriteRuleBaseResponseDto[], number]> {
        this.log.debug({
            message: 'read rewrite rules base',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new RewriteRuleBaseResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<RewriteRuleBaseResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
