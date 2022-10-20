import {Controller, Get, Post, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Auth} from './decorators/auth.decorator'
import {AuthService} from './auth/auth.service'

@Auth()
@Controller()
export class AppController {
    constructor(private authService: AuthService) {
    }

    @ApiTags('Auth')
    @Post('auth/jwt')
    async login(@Req() req) {
        return this.authService.signJwt(req.user)
    }

    @ApiTags('Userinfo')
    @Get('userinfo')
    async userinfo(@Req() req) {
        return req.user
    }
}
