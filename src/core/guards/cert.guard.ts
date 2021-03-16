import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";
import {AdminsService} from "src/modules/admins/admins.service";
import {BasicAuthGuard} from "./basic.auth.guard";

@Injectable()
export class CertGuard extends BasicAuthGuard implements CanActivate {
    constructor(
        protected readonly adminsService: AdminsService,
    ) {
        super(adminsService)
    }


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const certificate = request.socket.getPeerCertificate(true)

        // return true; // TODO: Remove this after tests

        const sn_string = certificate.serialNumber ? certificate.serialNumber : request.headers['x-ssl-client-serial'];
        const sn = parseInt(sn_string, 16)
        if (!sn) {
            return await super.canActivate(context); // cert not received as neither cert nor header, trying basic auth
        }
        const admin = await this.adminsService.searchOne({where: {ssl_client_m_serial: sn}});
        if (!admin) {
            return await super.canActivate(context); // no user with matching cert found, trying basic auth
        }
        return true;
    }
}