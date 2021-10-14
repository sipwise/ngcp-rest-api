import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {JwtService} from '@nestjs/jwt'
import {AppService} from '../app.service'
import {AuthResponseDto} from './dto/auth-response.dto'
import {RBAC_ROLES} from '../config/constants.config'
import {compare} from 'bcrypt'
import {db} from '../entities'

/**
 * `AuthService` provides functionality to authenticate Admins and to sign JWTs for authenticated users
 */
@Injectable()
export class AuthService {
    private readonly log = new Logger(AuthService.name)

    /**
     * Creates a new `AuthService`
     * @param jwtService    JWT service to sign access tokens
     */
    constructor(
        private readonly app: AppService,
        private jwtService: JwtService,
    ) {
    }

    isAdminValid(admin: db.billing.Admin): boolean {
        if (!admin) {
            this.log.debug({message: 'validating admin', success: false, constraint: 'empty object'})
            return false
        }
        if (!admin.is_active) {
            this.log.debug({message: 'validating admin', success: false, constraint: 'is_active'})
            throw new ForbiddenException()
        }
        this.log.debug({message: 'validating admin', success: true})
        return true
    }

    toResponse(db: db.billing.Admin): AuthResponseDto {
        let response: AuthResponseDto = {
            active: db.is_active,
            id: db.id,
            readOnly: db.read_only,
            reseller_id: db.reseller_id,
            role: '',
            showPasswords: db.show_passwords,
            ssl_client_certificate: db.ssl_client_certificate,
            ssl_client_m_serial: db.ssl_client_m_serial,
            username: db.login,
            is_master: db.is_master,
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
        this.log.debug({
            message: 'user authentication',
            success: true,
            username: response.username,
            role: response.role,
        })
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
        this.log.debug({message: 'starting user authentication', method: this.validateAdmin.name, username: username})
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({where: {login: username}})
        if (!this.isAdminValid(admin)) {
            return null
        }
        const [b64salt, b64hash] = admin.saltedpass.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13

        if (admin && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
            return this.toResponse(admin)
        }
        this.log.debug({message: 'user authentication', success: false, username: username})
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
        this.log.debug({message: 'starting user authentication', method: this.validateAdminCert.name, serial: serial})
        const sn = parseInt(serial, 16)
        if (!sn) {
            this.log.debug({message: 'could not parse serial', serial: serial})
            return null
        }
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({where: {ssl_client_m_serial: sn}})
        if (!this.isAdminValid(admin)) {
            return null
        }
        this.log.debug({message: 'user authentication', success: false, serial: serial})
        return this.toResponse(admin)
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
        this.log.debug({message: 'signing JWT token', username: user.username, id: user.id})
        return {
            access_token: this.jwtService.sign(payload, {algorithm: 'HS256', noTimestamp: true}),
        }
    }
}
