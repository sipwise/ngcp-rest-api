import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'

import {TemplateResponseDto} from './dto/template-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
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
    @ApiPaginatedResponse(TemplateResponseDto)
    async readAll(@Req() req): Promise<[TemplateResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all templates',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const response = [new TemplateResponseDto({url: req.url})]
        return [response, 1]
    }
}
