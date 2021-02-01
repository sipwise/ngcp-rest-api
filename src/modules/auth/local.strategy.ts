import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            usernameField: 'login'
        });
    }

    async validate(username: string, password: string): Promise<any>{
        console.log("Called validate function");
        const user = await this.authService.validateUser(username, password);
        if (!user) {
         throw new UnauthorizedException('Invalid admin user credentials');
        }
        return user;
    }
}