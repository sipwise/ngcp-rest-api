import { Injectable } from '@nestjs/common';
import { AdminsService } from '../admins/admins.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly adminService: AdminsService,
        // private readonly jwtService: JwtService,
    ) {}

    async validateUser(username: string, pass: string) {
        const user = await this.adminService.findOneByLogin(username);
        console.log("Got user"+user)
        if(!user) {
            return null;
        }

        const match = await this.comparePassword(pass, user.saltedpass);
        if(!match) {
            return null;
        }
        const {password, ...result} = user['dataValues'];
        return result;
    }

    private async comparePassword(enteredPassword, dbPassword) {
        const match = await bcrypt.compare(enteredPassword, dbPassword);
        return match;
    }
}
