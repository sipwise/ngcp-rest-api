import {Controller, Get, Post, Request, UseGuards} from "@nestjs/common";
import {AuthGuard} from "@nestjs/passport";
import {AuthService} from "./modules/auth/auth.service";
import {PasswordGuard} from "./core/guards/password.guard";
import {JwtGuard} from "./core/guards/jwt.guard";

@Controller()
export class AppController {
    constructor(private authService: AuthService) {}

    @UseGuards(PasswordGuard)
    @Post('auth/login')
    async login(@Request() req) {
        return this.authService.signJwt(req.user);
    }

    @UseGuards(JwtGuard)
    @Get('userinfo')
    async userinfo(@Request() req) {
        console.log(req.user)
        return req.user
    }
}