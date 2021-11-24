import {Controller, Get, Post, Req, UseGuards} from '@nestjs/common'
import {AuthService} from './auth/auth.service'
import {JwtGuard} from './guards/jwt.guard'
import {PasswordGuard} from './guards/password.guard'

@Controller()
export class AppController {
    constructor(private authService: AuthService) {
    }

    @UseGuards(PasswordGuard)
    @Post('auth/jwt')
    async login(@Req() req) {
        return this.authService.signJwt(req.user)
    }

    @UseGuards(JwtGuard)
    @Get('userinfo')
    async userinfo(@Req() req) {
        return req.user
    }
}
