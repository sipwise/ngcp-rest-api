import {Body, Controller, Post, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {AuthJwtRequestDto} from './dto/jwt-request.dto'

import {AuthService} from '~/auth/auth.service'
import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
@Controller()
export class AuthJwtController {
    constructor(private readonly authService: AuthService) {
    }

    @ApiTags('Auth')
    @Post('auth/jwt')
    async login(
        @Body() dto: AuthJwtRequestDto,
        @Req() req: Request,
    ): Promise<{
        access_token: string;
        created_at: string;
        expires_at: string;
    }> {
        const sr = new ServiceRequest(req)
        return this.authService.signJwt(sr.user, dto.expires_in)
    }
}
