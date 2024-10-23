import {Controller, Get, Post, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Auth} from '~/decorators/auth.decorator'
import {AuthService} from '~/auth/auth.service'

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
    async userinfo(@Req() req): Promise<any> {
        return req.user
    }
}
