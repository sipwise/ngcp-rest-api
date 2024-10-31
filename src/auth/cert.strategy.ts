import {Injectable, UnauthorizedException} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {Strategy} from 'passport-http-header-strategy'

import {AuthService} from './auth.service'
import {AuthResponseDto} from './dto/auth-response.dto'

/**
 * Implementation of the HTTP header strategy
 */
@Injectable()
export class CertStrategy extends PassportStrategy(Strategy, 'cert-header') {
    /**
     * Sets the HTTP header that the certificate serial number is read from to `x-ssl-client-serial`
     * @param authService AuthService to validate the Admin certificate
     */
    constructor(private readonly authService: AuthService) {
        super({header: 'x-ssl-client-serial'})
    }

    /**
     * Validates the `Admin` using the certificate serial number
     * @param token Certificate serial number
     */
    async validate(token: string): Promise<AuthResponseDto> {
        const admin = this.authService.validateAdminCert(token)
        if (!admin) {
            throw new UnauthorizedException()
        }
        return admin
    }
}
