import {
    ApiExtraModels,
    ApiTags,
} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Get, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {NCOSResponseDto} from './dto/ncos-response.dto'
import {PaginatedDto} from '../paginated.dto'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {RbacRole} from '../../config/constants.config'

const resourceName = 'ncos'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class NCOSController extends CrudController<never, NCOSResponseDto> {
    private readonly log = new LoggerService(NCOSController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(NCOSResponseDto)
    async readAll(@Req() req): Promise<[NCOSResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos',
            func: this.readAll.name,
            url: req.url,
            method: req.method
        })
        const response = [new NCOSResponseDto(req.url)]
        return [response, 1]
    }
}
