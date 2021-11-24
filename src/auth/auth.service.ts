import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {JwtService} from '@nestjs/jwt'
import {AppService} from '../app.service'
import {AuthResponseDto} from './dto/auth-response.dto'
import {compare} from 'bcrypt'
import {db} from '../entities'
import {RBAC_ROLES} from '../config/constants.config'

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

    /**
     * Tries to get [`Admin`]{@link db.billing.Admin} with `login` matching `username` from DB.
     * If an [`Admin`]{@link db.billing.Admin} is found the `password` is bcrypt-hashed and compared with the stored password.
     *
     * @param username {string} Login username
     * @param password {string} Login password
     *
     * @returns Authenticated `AuthResponseDto` on success else `null`
     */
    async validateAdmin(username: string, password: string): Promise<AuthResponseDto> {
        this.log.debug({message: 'starting user authentication', method: this.validateAdmin.name, username: username})
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({
            where: {login: username},
            relations: ['role'],
        })
        if (!this.isAdminValid(admin)) {
            return null
        }
        const [b64salt, b64hash] = admin.saltedpass.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13

        if (admin && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
            return this.adminAuthToResponse(admin)
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
     * @returns Authenticated `AuthResponseDto` on success else `null`
     */
    async validateAdminCert(serial: string): Promise<any> {
        this.log.debug({message: 'starting admin user certificate authentication', method: this.validateAdminCert.name, serial: serial})
        const sn = parseInt(serial, 16)
        if (!sn) {
            this.log.debug({message: 'could not parse serial', serial: serial})
            return null
        }
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({
            where: {ssl_client_m_serial: sn},
            relations: ['role'],
        })
        if (!this.isAdminValid(admin)) {
            return null
        }
        this.log.debug({message: 'admin user certificate authentication', success: false, serial: serial})
        return this.adminAuthToResponse(admin)
    }

    adminAuthToResponse(admin: db.billing.Admin): AuthResponseDto {
        let response: AuthResponseDto = {
            active: admin.is_active,
            id: admin.id,
            readOnly: admin.read_only,
            reseller_id: admin.reseller_id,
            role: admin.role.role,
            role_data: admin.role,
            showPasswords: admin.show_passwords,
            username: admin.login,
            is_master: admin.is_master,
            reseller_id_required: admin.role.role == RBAC_ROLES.reseller || admin.role.role == RBAC_ROLES.ccare
        }
        this.log.debug({
            message: 'admin user authentication',
            success: true,
            username: response.username,
            role: response.role,
        })
        return response
    }

    isSubscriberValid(subscriber: db.provisioning.VoipSubscriber): boolean {
        if (!subscriber) {
            this.log.debug({message: 'validating subscriber', success: false, constraint: 'empty object'})
            return false
        }
        this.log.debug({message: 'validating subscriber', success: true})
        return true
    }

    /**
     * Tries to get [`VoipSubscriber`]{@link db.provisioning.VoipSubscriber} with `login` matching `username` from DB.
     * If an [`VoipSubscriber`]{@link db.provisioning.VoipSubscriber} is found the `password` is bcrypt-hashed and compared with the stored password.
     *
     * @param username {string} Login username
     * @param password {string} Login password
     *
     * @returns Authenticated `AuthResponseDto` on success else `null`
     */
    async validateSubscriber(username: string, domain: string, password: string): Promise<AuthResponseDto> {
        this.log.debug({message: 'starting subscriber user authentication', method: this.validateAdmin.name, username: username})
        const subscriber = await this.app.dbRepo(db.provisioning.VoipSubscriber).findOne({
            where: {
                username: username,
                domain: { domain: domain }
            },
            relations: [
                "domain",
                "contract",
                "contract.contact",
                "billing_voip_subscriber"
            ]
        })
        if (!this.isSubscriberValid(subscriber)) {
            return null
        }
        const [b64salt, b64hash] = subscriber.webpassword.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13

        if (subscriber && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
            return this.subscriberAuthToResponse(subscriber)
        }
        this.log.debug({message: 'subscriber user authentication', success: false, username: username})
        return null
    }

    subscriberAuthToResponse(subscriber: db.provisioning.VoipSubscriber): AuthResponseDto {
        let response: AuthResponseDto = {
            active: true,
            id: subscriber.billing_voip_subscriber.id,
            readOnly: false,
            reseller_id: subscriber.contract.contact.reseller_id,
            role: 'subscriber',
            reseller_id_required: true,
            showPasswords: false,
            username: subscriber.username,
            is_master: false,
            uuid: subscriber.uuid
        }
        this.log.debug({
            message: 'subscriber user authentication',
            success: true,
            username: response.username,
            role: response.role,
        })
        return response
    }

    /**
     * Signs a JWT for an authenticated `Admin` user
     *
     * @param user Authenticated `Admin` user
     *
     * @returns JSON Web Token
     */
    async signJwt(user: AuthResponseDto) {
        const payload = user.role == "subscriber"
                            ? {username: user.username, subscriber_uuid: user.uuid}
                            : {username: user.username, id: user.id}
        this.log.debug({message: 'signing JWT token', payload})
        return {
            access_token: this.jwtService.sign(payload, {algorithm: 'HS256', noTimestamp: true}),
        }
    }
}
