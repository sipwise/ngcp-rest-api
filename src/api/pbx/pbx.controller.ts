import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {PbxResponseDto} from './dto/pbx-response.dto'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {License as LicenseType, RbacRole} from '../../config/constants.config'
import {License} from '../../decorators/license.decorator'

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
    @ApiPaginatedResponse(PbxResponseDto)
    async readAll(@Req() req): Promise<[PbxResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all pbx',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const response = [new PbxResponseDto(req.url)]
        return [response, 1]
    }
}
