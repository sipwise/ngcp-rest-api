import {Controller, Get, Post, Request, UseGuards} from '@nestjs/common'
import {AuthService} from './auth/auth.service'
import {PasswordGuard} from './guards/password.guard'
import {JwtGuard} from './guards/jwt.guard'

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
        console.log(req.user)
        return req.user
    }
}
