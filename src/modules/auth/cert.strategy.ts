import {Injectable, UnauthorizedException} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {Strategy} from "passport-http-header-strategy";
import {AuthService} from "./auth.service";

@Injectable()
export class CertStrategy extends PassportStrategy(Strategy, 'cert-header') {
    constructor(private authService: AuthService) {
        super({header: 'x-ssl-client-serial'});
    }

    async validate(token: string): Promise<any> {
        const admin = this.authService.validateAdminCert(token);
        if (!admin) {
            throw new UnauthorizedException();
        }
        return admin
    }
}
