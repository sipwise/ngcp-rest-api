import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminsService } from "src/modules/admins/admins.service";

@Injectable()
export class CertGuard implements CanActivate {
    constructor(
        private readonly adminsService: AdminsService,
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        console.log(request.headers);
        const certificate = request.socket.getPeerCertificate(true)

        const sn = certificate.serialNumber ? certificate.serialNumber : request.headers['x-ssl-client-serial'];

        console.log(sn);
        if (!sn) {
            return false; // cert not received as neither cert nor header
        }
        console.log(sn); // TODO: check certificate serial in database

        return true;
    }
}