import {ForbiddenException, Injectable} from '@nestjs/common'
import {JwtService} from '@nestjs/jwt'
import {compare} from 'bcrypt'
import {AppService} from '../app.sevice'
import {RBAC_ROLES} from '../config/constants.config'
import {db} from '../entities'
import {AuthResponseDto} from './dto/auth-response.dto'


/**
 * `AuthService` provides functionality to authenticate Admins and to sign JWTs for authenticated users
 */
@Injectable()
export class AuthService {

    /**
     * Creates a new `AuthService`
     * @param jwtService    JWT service to sign access tokens
     */
    constructor(
        private readonly app: AppService,
        private jwtService: JwtService,
    ) {
    }

    static isAdminValid(admin: db.billing.Admin): boolean {
        if (!admin) {
            return false
        }
        if (!admin.is_active) {
            throw new ForbiddenException()
        }
        return true
    }

    private static toResponse(db: db.billing.Admin): AuthResponseDto {
        let response: AuthResponseDto = {
            active: db.is_active,
            id: db.id,
            readOnly: db.read_only,
            reseller_id: db.reseller_id,
            role: '',
            showPasswords: db.show_passwords,
            ssl_client_certificate: db.ssl_client_certificate,
            ssl_client_m_serial: db.ssl_client_m_serial,
            username: db.login
        }
        if (db.is_system) {
            response.role = RBAC_ROLES.system
        } else if (db.is_superuser) {
            response.role = RBAC_ROLES.admin
            if (db.is_ccare)
                response.role = RBAC_ROLES.ccareadmin
        } else if (db.is_ccare) {
            response.role = RBAC_ROLES.ccare
        } else {
            response.role = RBAC_ROLES.reseller
        }
        return response
    }

    /**
     * Tries to get [`Admin`]{@link db.billing.Admin} with `login` matching `username` from DB.
     * If an [`Admin`]{@link db.billing.Admin} is found the `password` is bcrypt-hashed and compared with the stored password.
     *
     * @param username {string} Login username
     * @param password {string} Login password
     *
     * @returns Authenticated `Admin` on success else `null`
     */
    async validateAdmin(username: string, password: string): Promise<AuthResponseDto> {
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({where: {login: username}})
        if (!AuthService.isAdminValid(admin)) {
            return null
        }
        const [b64salt, b64hash] = admin.saltedpass.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13

        if (admin && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
            return AuthService.toResponse(admin)
        }
        return null
    }

    /**
     * Parses `serial` into an int and tries to get [`Admin`]{@link db.billing.Admin} from DB.
     * If an [`Admin`]{@link db.billing.Admin} is found the `serial` is compared to `ssl_client_m_serial` stored in DB.
     *
     * @param serial {string} Certificate serial number in Hex format
     *
     * @returns Authenticated `Admin` on success else `null`
     */
    async validateAdminCert(serial: string): Promise<any> {
        const sn = parseInt(serial, 16)
        if (!sn) {
            return null
        }
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({where: {ssl_client_m_serial: sn}})
        if (!AuthService.isAdminValid(admin)) {
            return null
        }
        return AuthService.toResponse(admin)
    }

    /**
     * Signs a JWT for an authenticated `Admin` user
     *
     * @param user Authenticated `Admin` user
     *
     * @returns JSON Web Token
     */
    async signJwt(user: any) {
        const payload = {username: user.username, id: user.id}
        return {
            access_token: this.jwtService.sign(payload, {algorithm: 'HS256', noTimestamp: true,}),
        }
    }
}
