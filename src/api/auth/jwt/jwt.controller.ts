import {Body, Controller, Post, Req} from '@nestjs/common'
import {ApiOperation, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {AuthJwtRequestDto} from './dto/jwt-request.dto'

import {AuthService} from '~/auth/auth.service'
import {AuthOptions} from '~/decorators/auth-options.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {NoExpand} from '~/decorators/expand.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
// read-only users must be able to obtain a token
@AuthOptions({skipReadOnly: true, allowBodyCredentials: true})
@NoExpand()
@Controller()
export class AuthJwtController {
    constructor(private readonly authService: AuthService) {
    }

    @ApiTags('Auth')
    @Post('auth/jwt')
    @ApiOperation({summary: 'Get an access token'})
    login(
        @Body() dto: AuthJwtRequestDto,
        @Req() req: Request,
    ): {
        access_token: string;
        created_at: string;
        expires_at: string;
    } {
        const sr = new ServiceRequest(req)
        return this.authService.signJwt(sr.user, dto.expires_in)
    }
}
