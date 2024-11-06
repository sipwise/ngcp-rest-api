import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'

import {RewriteRuleResponseDto} from './dto/rewrite-rule-response.dto'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'rewrite-rules'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('Rewrite Rules')
@Controller(resourceName)
export class RewriteRuleController extends CrudController<never, RewriteRuleResponseDto> {
    private readonly log = new LoggerService(RewriteRuleController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(RewriteRuleResponseDto)
    async readAll(@Req() req): Promise<[RewriteRuleResponseDto[], number]> {
        this.log.debug({
            message: 'read all header manipulations',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const response = [new RewriteRuleResponseDto(req.url)]
        return [response, 1]
    }
}
