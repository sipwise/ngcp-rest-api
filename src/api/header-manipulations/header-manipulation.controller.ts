import {ApiTags} from '@nestjs/swagger'
import {Auth} from '~/decorators/auth.decorator'
import {Controller, Get, Req} from '@nestjs/common'
import {CrudController} from '~/controllers/crud.controller'
import {HeaderManipulationResponseDto} from '~/api/header-manipulations/dto/header-manipulation-response.dto'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {LoggerService} from '~/logger/logger.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {License} from '~/decorators/license.decorator'

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
    @ApiPaginatedResponse(HeaderManipulationResponseDto)
    async readAll(@Req() req): Promise<[HeaderManipulationResponseDto[], number]> {
        this.log.debug({
            message: 'read all header manipulations',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const response = [new HeaderManipulationResponseDto(req.url)]
        return [response, 1]
    }
}
