import {ApiTags} from '@nestjs/swagger'
import {Auth} from '../../../decorators/auth.decorator'
import {Controller, Get, Req} from '@nestjs/common'
import {CrudController} from '../../../controllers/crud.controller'
import {PasswordResponseDto} from './dto/password-response.dto'
import {ApiPaginatedResponse} from '../../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../../logger/logger.service'
import {AuthOptions} from '../../../decorators/auth-options.decorator'

const resourceName = 'auth/password'

@Controller(resourceName)
@AuthOptions({skipMaxAge: true})
@Auth()
@ApiTags('Auth')
export class PasswordController extends CrudController<never, PasswordResponseDto> {
    private readonly log = new LoggerService(PasswordController.name)

    constructor(
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(PasswordResponseDto)
    async readAll(@Req() req): Promise<[PasswordResponseDto[], number]> {
        this.log.debug({
            message: 'read all password routes',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const response = [new PasswordResponseDto(req.url)]
        return [response, 1]
    }
}
