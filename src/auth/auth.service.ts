import {Inject, Injectable} from '@nestjs/common'
import {compare} from 'bcrypt'
import {JwtService} from '@nestjs/jwt'
import {ADMIN_REPOSITORY} from '../config/constants.config'
import {Admin} from '../entities/db/billing/admin.entity'
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
        @Inject(ADMIN_REPOSITORY) private readonly authRepo: typeof Admin,
        private jwtService: JwtService,
    ) {
    }

    private static toResponse(db: Admin): AuthResponseDto {
        return {
            billing_data: db.billing_data,
            call_data: db.call_data,
            can_reset_password: db.can_reset_password,
            id: db.id,
            is_active: db.is_active,
            is_ccare: db.is_ccare,
            is_master: db.is_master,
            is_superuser: db.is_superuser,
            is_system: db.is_system,
            lawful_intercept: db.lawful_intercept,
            login: db.login,
            read_only: db.read_only,
            show_passwords: db.show_passwords,
            ssl_client_certificate: db.ssl_client_certificate,
            ssl_client_m_serial: db.ssl_client_m_serial,
        }
    }

    /**
     * Tries to get [`Admin`]{@link Admin} with `login` matching `username` from DB.
     * If an [`Admin`]{@link Admin} is found the `password` is bcrypt-hashed and compared with the stored password.
     *
     * @param username {string} Login username
     * @param password {string} Login password
     *
     * @returns Authenticated `Admin` on success else `null`
     */
    async validateAdmin(username: string, password: string): Promise<AuthResponseDto> {
        const login = username
        const admin = await this.authRepo.findOne<Admin>({where: {login}})
        if (!admin) {
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
     * Parses `serial` into an int and tries to get [`Admin`]{@link Admin} from DB.
     * If an [`Admin`]{@link Admin} is found the `serial` is compared to `ssl_client_m_serial` stored in DB.
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
        const admin = await this.authRepo.findOne({where: {ssl_client_m_serial: sn}})
        if (!admin) {
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
        const payload = {username: user.login, sub: user.id}
        return {
            access_token: this.jwtService.sign(payload),
        }
    }
}
