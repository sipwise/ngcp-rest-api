import {Controller, Get, Req} from '@nestjs/common'
import {ApiExtraModels, ApiTags} from '@nestjs/swagger'
import {PbxResponseDto} from './dto/pbx-response.dto'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {PaginatedDto} from '../../dto/paginated.dto'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'

const resourceName = 'pbx'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.subscriber,
)
@ApiTags('Pbx')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
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
