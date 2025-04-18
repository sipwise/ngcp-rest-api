import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'

import {BanResponseDto} from './dto/ban-response.dto'

import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
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
    @ApiPaginatedResponse(BanResponseDto)
    async readAll(@Req() req): Promise<[BanResponseDto[], number]> {
        this.log.debug({
            message: 'read all ban routes',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const response = [new BanResponseDto({url: req.url})]
        return [response, 1]
    }
}
