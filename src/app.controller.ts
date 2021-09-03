import {Controller, Get, Post, Request, UseGuards} from '@nestjs/common'
import {AuthService} from './auth/auth.service'
import {JwtGuard} from './guards/jwt.guard'
import {PasswordGuard} from './guards/password.guard'

@Controller()
export class AppController {
    constructor(private authService: AuthService) {
    }

    @UseGuards(PasswordGuard)
    @Post('auth/login')
    async login(@Request() req) {
        return this.authService.signJwt(req.user)
    }

    @UseGuards(JwtGuard)
    @Get('userinfo')
    async userinfo(@Request() req) {
        return req.user
    }
}
