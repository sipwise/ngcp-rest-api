import {ForbiddenException, Injectable} from '@nestjs/common'
import {JwtService} from '@nestjs/jwt'
import {compare} from 'bcrypt'
import Redis, {Cluster} from 'ioredis'

import {AuthResponseDto} from './dto/auth-response.dto'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

/**
 * `AuthService` provides functionality to authenticate Admins and to sign JWTs for authenticated users
 */
@Injectable()
export class AuthService {
    private readonly log = new LoggerService(AuthService.name)

    /**
     * Creates a new `AuthService`
     * @param jwtService    JWT service to sign access tokens
     */
    constructor(
        private readonly app: AppService,
        private readonly jwtService: JwtService,
    ) {
    }

    async getRedisBanDb(): Promise<Redis | Cluster> {
        const DB = 19
        const redis = await this.app.redis
        await redis.select(DB)
        return redis
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
    async validateAdmin(_req:ServiceRequest, username: string, password: string, _domain:string, _realm:string): Promise<AuthResponseDto> {
        this.log.debug({message: 'starting user authentication', method: this.validateAdmin.name, username: username})
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({
            where: {login: username},
            relations: ['role'],
        })
        if (!this.isAdminValid(admin)) {
            return null
        }
        admin.role = await this.app.dbRepo(db.billing.AclRole).findOne({
            where: {
                id: admin.role.id,
            },
            relations: ['has_access_to'],
        })

        if (admin && await this.compareBcryptPassword(password, admin.saltedpass)  !== false) {
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
    async validateAdminCert(serial: string): Promise<AuthResponseDto | null> {
        this.log.debug({
            message: 'starting admin user certificate authentication',
            method: this.validateAdminCert.name,
            serial: serial,
        })
        const sn = parseInt(serial, 16)
        if (!sn) {
            this.log.debug({message: 'could not parse serial', serial: serial})
            return null
        }
        const admin = await this.app.dbRepo(db.billing.Admin).findOne({
            where: {ssl_client_m_serial: sn},
            relations: ['role'],
        })
        const role = await this.app.dbRepo(db.billing.AclRole).findOne({
            where: {
                id: admin.role.id,
            },
            relations: ['has_access_to'],
        })
        admin.role = role
        if (!this.isAdminValid(admin)) {
            return null
        }
        this.log.debug({message: 'admin user certificate authentication', success: false, serial: serial})
        return this.adminAuthToResponse(admin)
    }

    adminAuthToResponse(admin: db.billing.Admin): AuthResponseDto {
        const response: AuthResponseDto = {
            active: admin.is_active,
            id: admin.id,
            readOnly: admin.read_only,
            reseller_id: admin.reseller_id,
            role: admin.role.role,
            role_data: admin.role.toInternal(),
            showPasswords: admin.show_passwords,
            username: admin.login,
            is_master: admin.is_master,
            password_modified_timestamp: admin.saltedpass_modify_timestamp,
            reseller_id_required:
                admin.role.role == RbacRole.reseller ||
                admin.role.role == RbacRole.ccare ||
                admin.role.role == RbacRole.subscriber ||
                admin.role.role == RbacRole.subscriberadmin,
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
    async validateSubscriber(_req: ServiceRequest, username: string, password: string, domain: string, _realm:string): Promise<AuthResponseDto> {
        this.log.debug({
            message: 'starting subscriber user authentication',
            method: this.validateAdmin.name,
            username: username,
        })
        const subscriber = await db.provisioning.VoipSubscriber.findOne({
            where: {
                webusername: username,
                domain: {domain: domain},
            },
            relations: [
                'billing_voip_subscriber',
                'contract',
                'contract.contact',
                'contract.product',
                'domain',
            ],
        })
        if (!this.isSubscriberValid(subscriber)) {
            return null
        }

        if (subscriber && await this.compareBcryptPassword(password, subscriber.webpassword) !== false) {
            return this.subscriberAuthToResponse(subscriber)
        }
        this.log.debug({message: 'subscriber user authentication', success: false, username: username})
        return null
    }

    subscriberAuthToResponse(subscriber: db.provisioning.VoipSubscriber): AuthResponseDto {
        const role = subscriber.admin ? 'subscriberadmin'
            : 'subscriber'
        const response: AuthResponseDto = {
            active: true,
            id: subscriber.billing_voip_subscriber.id,
            readOnly: false,
            reseller_id: subscriber.contract.contact.reseller_id,
            role: role,
            reseller_id_required: true,
            showPasswords: false,
            username: subscriber.username,
            is_master: false,
            uuid: subscriber.uuid,
            customer_id: subscriber.account_id,
            password_modified_timestamp: subscriber.webpassword_modify_timestamp,
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
    async signJwt(user: AuthResponseDto): Promise<{
        access_token: string;
    }> {
        const payload = user.role == 'subscriber'
            ? {username: user.username, subscriber_uuid: user.uuid}
            : {username: user.username, id: user.id}
        this.log.debug({message: 'signing JWT token', payload})
        return {
            access_token: this.jwtService.sign(payload, {algorithm: 'HS256', noTimestamp: true}),
        }
    }

    async compareBcryptPassword(password: string, password2: string): Promise<boolean> {
        const [b64salt, b64hash] = password2.split('$')
        const bcrypt_version = '2b'
        const bcrypt_cost = 13
        if (!process.env.NODE_WP_BUNDLE &&
             process.env.NODE_ENV === 'development' &&
             process.env.API_DEV_SKIP_PASS_AUTH === 'true') {
            this.log.log({message: '"API_DEV_SKIP_PASS_AUTH" MODE!'})
            return true
        }
        return await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`)
    }

    async ban(username: string, domain: string, realm: string, ip: string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }

        const minTime = this.app.config.security.login.ban_min_time || 300
        const maxTime = this.app.config.security.login.ban_max_time || 3600
        const increment = this.app.config.security.login.ban_increment || 300
        const key = `login:ban:${username}:${domain}:${realm}:${ip}`
        let incrementStage = -1
        let expire = 3600

        const userRepo = realm === 'subscriber' ? db.provisioning.VoipSubscriber : db.billing.Admin
        const userField = realm === 'subscriber' ? 'webusername' : 'login'
        const user = await this.app.dbRepo(userRepo).findOne({
            where: {
                [userField]: username,
            },
            select: ['ban_increment_stage'],
        })
        if (user) {
            incrementStage = user.ban_increment_stage
        }
        if (incrementStage >= 0) {
            expire = Math.min(maxTime, minTime + incrementStage * increment)
            incrementStage++
        }

        this.app.logger().debug({
            message: `Banning user for ${expire} seconds`,
            username: username,
            domain: domain,
            realm: realm,
            ip: ip,
        })

        await (await this.getRedisBanDb()).hset(key, 'banned_at', Math.floor(Date.now() / 1000))
        await (await this.getRedisBanDb()).expire(key, expire)
        if (incrementStage >= 0 && user) {
            await this.app.dbRepo(userRepo).update({[userField]: username}, {ban_increment_stage: incrementStage})
        }
    }

    async registerFailedLoginAttempt(username:string, domain:string, realm:string, ip:string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }
        const maxAttempts = this.app.config.security.login.max_attempts
        const expire = this.app.config.security.login.ban_max_time || 3600
        const key = `login:fail:${username}:${domain}:${realm}:${ip}`
        const attempted = +(await (await this.getRedisBanDb()).hget(key, 'attempts') || 0) + 1

        if (attempted >= maxAttempts) {
            await this.ban(username, domain, realm, ip)
        } else {
            await (await this.getRedisBanDb()).multi()
                .hset(key, 'attempts', attempted)
                .hset(key, 'last_attempt', Math.floor(Date.now() / 1000))
                .expire(key, expire)
                .exec()
        }
    }

    async isUserBanned(username:string, domain:string, realm:string, ip:string): Promise<boolean> {
        if (!this.app.config.security.login.ban_enable) {
            return false
        }
        const key = `login:ban:${username}:${domain}:${realm}:${ip}`
        return await (await this.getRedisBanDb()).exists(key) == 1
    }

    async clearFailedLoginAttempts(username:string, domain:string, realm:string, ip:string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }
        const key = `login:fail:${username}:${domain}:${realm}:${ip}`
        await (await this.getRedisBanDb()).del(key)
    }

    async resetBanIncrementStage(username: string, realm: string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }
        const userRepo = realm === 'subscriber' ? db.provisioning.VoipSubscriber : db.billing.Admin
        const userField = realm === 'subscriber' ? 'webusername' : 'login'

        const user = await this.app.dbRepo(userRepo).findOne({
            where: {
                [userField]: username,
            },
        })

        if (user) {
            this.app.logger().debug({
                message: 'Resetting ban increment stage',
                username: username,
            })
            await this.app.dbRepo(userRepo).update({[userField]: username}, {ban_increment_stage: 0})
        }
    }

    async isPasswordExpired(passwordModified: Date): Promise<boolean> {
        if (this.app.config.security.password.web_max_age_days > 0) {
            const diff = Math.abs(new Date().getTime() - passwordModified.getTime())
            const diffDays = Math.ceil(diff / (1000 * 3600 * 24))
            return diffDays > this.app.config.security.password.web_max_age_days
        }

        return false
    }
}
