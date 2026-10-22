import {Body, Controller, ForbiddenException, HttpCode, HttpStatus, Inject, Post, Req, Res} from '@nestjs/common'
import {ApiBody, ApiHeader, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request, Response} from 'express'
import {I18nService} from 'nestjs-i18n'

import {AuthGrafanaRequestDto} from './dto/grafana-request.dto'
import {AuthGrafanaResponseDto} from './dto/grafana-response.dto'

import {RbacRole} from '~/config/constants.config'
import {AuthOptions} from '~/decorators/auth-options.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'auth/grafana'
const grafanaAdminUser = 'admin'

@Auth(
    RbacRole.admin,
    RbacRole.system,
)
@AuthOptions({skipReadOnly: true})
@ApiTags('Auth')
@Controller(resourceName)
export class AuthGrafanaController {
    private readonly log = new LoggerService(AuthGrafanaController.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiBody({
        type: AuthGrafanaRequestDto,
        required: false,
    })
    @ApiHeader({
        name: AuthGrafanaRequestDto.editHeader,
        description: 'Request Grafana edit (admin) access with "1". "grafana_edit" in the request body takes precedence',
        required: false,
        schema: {type: 'string', enum: ['0', '1']},
    })
    @ApiOkResponse({
        type: AuthGrafanaResponseDto,
        headers: {
            [AuthGrafanaResponseDto.userHeader]: {
                description: 'Same value as "grafana_user" in the response body',
                schema: {type: 'string'},
            },
        },
    })
    async grafana(
        @Body() dto: AuthGrafanaRequestDto,
        @Req() req: Request,
        @Res({passthrough: true}) res: Response,
    ): Promise<AuthGrafanaResponseDto> {
        this.log.debug({
            message: 'grafana auth',
            func: this.grafana.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const edit = AuthGrafanaRequestDto.isEdit(dto, sr.req.headers)

        if (edit && sr.user.readOnly)
            throw new ForbiddenException(this.i18n.t('errors.PERMISSION_DENIED'))

        const response = new AuthGrafanaResponseDto()
        response.grafana_user = edit ? grafanaAdminUser : sr.user.username
        res.setHeader(AuthGrafanaResponseDto.userHeader, response.grafana_user)
        return response
    }
}
