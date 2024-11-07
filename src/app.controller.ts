import {Controller, Get, Post, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {AuthService} from './auth/auth.service'
import {Auth} from './decorators/auth.decorator'

import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
@Controller()
export class AppController {
    constructor(private readonly authService: AuthService) {
    }

    @ApiTags('Auth')
    @Post('auth/jwt')
    async login(@Req() req: Request): Promise<{
        access_token: string;
    }> {
        const sr = new ServiceRequest(req)
        return this.authService.signJwt(sr.user)
    }

    @ApiTags('Userinfo')
    @Get('userinfo')
    async userinfo(@Req() req: Request): Promise<unknown> {
        const sr = new ServiceRequest(req)
        return sr.user
    }
}
