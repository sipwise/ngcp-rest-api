import {Injectable} from '@nestjs/common'
import {AdminsService} from '../admins/admins.service'
import {compare} from 'bcrypt'
import {JwtService} from '@nestjs/jwt'

/**
 * `AuthService` provides functionality to authenticate Admins and to sign JWTs for authenticated users
 */
@Injectable()
export class AuthService {
    /**
     * Creates a new `AuthService`
     * @param adminsService Admin service to access DB
     * @param jwtService    JWT service to sign access tokens
     */
    constructor(
        private adminsService: AdminsService,
        private jwtService: JwtService,
    ) {
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
    async validateAdmin(username: string, password: string): Promise<any> {
        const admin = await this.adminsService.findOneByLogin(username)
        if (!admin) {
            return null
        }
        const [b64salt, b64hash] = admin.saltedpass.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13

        if (admin && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
            const {saltedpass, ...result} = admin
            return result
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
        const admin = await this.adminsService.searchOne({where: {ssl_client_m_serial: sn}})
        if (!admin) {
            return null
        }
        const {saltedpass, ...result} = admin
        return result
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
