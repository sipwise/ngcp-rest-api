import {Injectable, UnauthorizedException} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {AuthService} from "./auth.service";
import {Request} from "express";
import {BasicStrategy} from "passport-http"
import {Strategy} from "passport-local";
import {Admin} from "../admins/admin.entity";

interface Authenticator {
    (username: string, password: string, service: AuthService): Promise<Admin>
}

let pwd_auth = async function (username: string, password: string, service: AuthService): Promise<Admin> {
    const admin = await service.validateAdmin(username, password);
    if(!admin) {
        throw new UnauthorizedException();
    }
    return admin;
}

@Injectable()
export class BasicHTTPStrategy extends PassportStrategy(BasicStrategy) {
    auth: Authenticator;
    constructor(private authService: AuthService) {
       super();
       this.auth = pwd_auth;
    }

    async validate(request: Request, username: string, password: string): Promise<any> {
       return await this.auth(username, password, this.authService);
    }
}

@Injectable()
export class BasicJSONStrategy extends PassportStrategy(Strategy) {
    auth: Authenticator;
    constructor(private authService: AuthService) {
        super();
        this.auth = pwd_auth;
    }

    async validate(request: Request, username: string, password: string): Promise<any> {
        return await this.auth(username, password, this.authService);
    }
}

