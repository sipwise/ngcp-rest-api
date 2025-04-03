import {Controller, Get, Inject, Param, Query, Req, Res, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {I18nService} from 'nestjs-i18n'

import {OtpResponseDto} from './dto/otp-response.dto'

import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiAcceptHeader} from '~/decorators/api-accept-header.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'auth/otp'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.lintercept,
)
@ApiTags('Otp')
@Controller(resourceName)
export class OtpController extends CrudController<never, never> {
    private readonly log = new LoggerService(OtpController.name)

    constructor(
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        super(resourceName)
    }

    @Get()
    @ApiQuery({
        name: 'qr',
        required: false, // Optional query parameter
        schema: {
            type: 'string',
            enum: ['true', 'false'],
            default: 'false',
        },
    })
    @ApiOkResponse({
        type: OtpResponseDto,
    })
    @ApiAcceptHeader('application/json', 'image/png')
    async readAll(
        @Req() req,
        @Param() _reqParams: unknown,
        @Query() _query: unknown,
        @Res({passthrough: true}) res,
    ): Promise<OtpResponseDto | StreamableFile> {
        this.log.debug({
            message: 'otp for user started',
            func: this.readAll.name,
            url: req.url,
            method:
            req.method,
        })

        const sr = new ServiceRequest(req)
        if (!sr.user.enable_2fa)
            throw new UnprocessableEntityException(this.i18n.t('errors.2FA_IS_DISABLED'))

        if (sr.query['qr'] === 'true') {
            return this.authService.handleQrCode(sr, res)
        }

        const response = new OtpResponseDto()
        response.otp_secret_key = sr.user.otp_secret_key
        return response
    }
}
