import {Controller, Get, Post, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'

import {AuthService} from './auth/auth.service'
import {Auth} from './decorators/auth.decorator'

@Auth()
@Controller()
export class AppController {
    constructor(private readonly authService: AuthService) {
    }

    @ApiTags('Auth')
    @Post('auth/jwt')
    async login(@Req() req): Promise<{
        access_token: string;
    }> {
        return this.authService.signJwt(req.user)
    }

    @ApiTags('Userinfo')
    @Get('userinfo')
    async userinfo(@Req() req): Promise<unknown> {
        return req.user
    }
}
