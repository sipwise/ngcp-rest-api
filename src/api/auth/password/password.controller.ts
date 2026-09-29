import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PasswordResponseDto} from './dto/password-response.dto'

import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {AuthOptions} from '~/decorators/auth-options.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'auth/password'

@Controller(resourceName)
@AuthOptions({skipMaxAge: true})
@Auth()
@ApiTags('Auth')
export class AuthPasswordController extends CrudController<never, PasswordResponseDto> {
    private readonly log = new LoggerService(AuthPasswordController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiSearchQuery(SearchLogic)
    @ApiPaginatedResponse(PasswordResponseDto)
    async readAll(@Req() req: Request): Promise<[PasswordResponseDto[], number]> {
        this.log.debug({
            message: 'read all password routes',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = [new PasswordResponseDto({url: req.url})]
        const sortedResponse = sortAndPaginate<PasswordResponseDto>(response, sr, 'resourceUrl')
        return [sortedResponse, response.length]
    }
}
