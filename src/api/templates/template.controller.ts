import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {TemplateResponseDto} from './dto/template-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'templates'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
)
@ApiTags('Template')
@Controller(resourceName)
export class TemplateController extends CrudController<never, TemplateResponseDto> {
    private readonly log = new LoggerService(TemplateController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(TemplateResponseDto)
    async readAll(@Req() req: Request): Promise<[TemplateResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all templates',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        const response = [new TemplateResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<TemplateResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
