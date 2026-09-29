import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {BanResponseDto} from './dto/ban-response.dto'

import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'bans'

@Auth()
@ApiTags('Bans')
@Controller(resourceName)
export class BanController extends CrudController<never, BanResponseDto> {
    private readonly log = new LoggerService(BanController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(BanResponseDto)
    async readAll(@Req() req: Request): Promise<[BanResponseDto[], number]> {
        this.log.debug({
            message: 'read all ban routes',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new BanResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<BanResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
