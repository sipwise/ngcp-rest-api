import {Readable} from 'stream'

import {ForbiddenException, Inject, Injectable, StreamableFile, UnauthorizedException} from '@nestjs/common'
import {JwtService} from '@nestjs/jwt'
import {compare} from 'bcrypt'
import {Response} from 'express'
import Redis, {Cluster} from 'ioredis'
import {I18nService} from 'nestjs-i18n'
import {authenticator} from 'otplib'
import * as QRCode from 'qrcode'

import {AuthResponseDto} from './dto/auth-response.dto'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {RedisDatabases} from '~/config/redis.config'
import {db, internal} from '~/entities'
import {findKeys, keyExists} from '~/helpers/redis.helper'
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
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        authenticator.options = {step: 30, window: 1}
    }

    async getRedisBanDb(): Promise<Redis | Cluster> {
        const redis = this.app.redis
        await redis.select(RedisDatabases.session)
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
    async validateAdmin(_req: ServiceRequest, username: string, password: string, _domain: string, _realm: string): Promise<AuthResponseDto> {
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

        if (admin && await this.compareBcryptPassword(password, admin.saltedpass) !== false) {
            await this.handleTwoFactorAuth(admin, _req)
            return this.adminAuthToResponse(admin)
        }
        this.log.debug({message: 'user authentication', success: false, username: username})
        return null
    }

    async handleQrCode(req: ServiceRequest, res: Response): Promise<StreamableFile> {
        const user = req.user as AuthResponseDto
        const companyName = this.app.config.general.companyname
        const username = user.username

        const otpAuthUrl = authenticator.keyuri(
            `NGCP-${companyName}: ${username}`,
            `NGCP-${companyName}`,
            user.otp_secret_key,
        )

        const qrCodeBuffer = await QRCode.toBuffer(otpAuthUrl)

        const stream = new Readable()
        stream.push(qrCodeBuffer)
        stream.push(null)

        res.set({
            'Content-Type': 'image/png',
            'Content-Disposition': 'inline',
        })
        res['passthrough'] = true

        return new StreamableFile(stream, {
            type: 'image/png',
            disposition: 'inline',
        })
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

    private assignAdminRoleData(admin: db.billing.Admin): internal.AclRole {
        const roleData = new internal.AclRole()
        roleData.id = admin.role.id
        roleData.role = admin.role.role
        roleData.is_acl = admin.role.is_acl
        roleData.has_access_to = admin.role.has_access_to?.map(r => {
            const simplifiedRole = new internal.AclRole()
            simplifiedRole.id = r.id
            simplifiedRole.role = r.role
            simplifiedRole.is_acl = r.is_acl
            simplifiedRole.has_access_to = undefined
            return simplifiedRole
        }) ?? []

        return roleData
    }

    adminAuthToResponse(admin: db.billing.Admin): AuthResponseDto {
        const response: AuthResponseDto = {
            active: admin.is_active,
            id: admin.id,
            readOnly: admin.read_only,
            reseller_id: admin.reseller_id,
            role: admin.role.role,
            role_data: this.assignAdminRoleData(admin),
            showPasswords: admin.show_passwords,
            username: admin.login,
            is_master: admin.is_master,
            password_modified_timestamp: admin.saltedpass_modify_timestamp,
            reseller_id_required:
                admin.role.role == RbacRole.reseller ||
                admin.role.role == RbacRole.ccare ||
                admin.role.role == RbacRole.subscriber ||
                admin.role.role == RbacRole.subscriberadmin,
            enable_2fa: admin.enable_2fa,
            otp_init: admin.show_otp_registration_info,
            otp_secret_key: admin.otp_secret,
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
    async validateSubscriber(_req: ServiceRequest, username: string, password: string, domain: string, _realm: string): Promise<AuthResponseDto> {
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
            username: subscriber.webusername,
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
     * Signs a JWT for an authenticated user
     *
     * @param user Authenticated user
     *
     * @returns JSON Web Token
     */
    async signJwt(user: AuthResponseDto): Promise<{
        access_token: string;
    }> {
        const payload = ['subscriber', 'subscriberadmin'].includes(user.role)
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
        let key = ''
        let incrementStage = -1
        let expire = 3600

        const userRepo = realm === 'subscriber' ? db.provisioning.VoipSubscriber : db.billing.Admin
        const userField = realm === 'subscriber' ? 'webusername' : 'login'
        let user: db.billing.Admin | db.provisioning.VoipSubscriber
        if (realm === 'admin') {
            const admin = await this.app.dbRepo(db.billing.Admin).findOne({
                where: {
                    login: username,
                },
                select: [
                    'id',
                    'reseller_id',
                    'ban_increment_stage',
                ],
            })
            if (!admin)
                throw new UnauthorizedException()
            key = this.loginBanAdminKey(username, domain, realm, ip, admin.id, admin.reseller_id)
            user = admin
        } else {
            const subscriber = await this.app.dbRepo(db.provisioning.VoipSubscriber).findOne({
                where: {
                    webusername: username,
                    domain: {domain: domain},
                },
                select: [
                    'id',
                    'uuid',
                    'account_id',
                    'ban_increment_stage',
                ],
                relations: ['billing_voip_subscriber'],
            })
            if (!subscriber)
                throw new UnauthorizedException()
            const subscriberId = subscriber.billing_voip_subscriber.id
            const customerId = subscriber.account_id
            key = this.loginBanSubscriberKey(username, domain, realm, ip, subscriberId, customerId)
            user = subscriber
        }

        if (user)
            incrementStage = user.ban_increment_stage

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

        const failKey = this.loginFailKey(username, domain, realm, ip)

        await (await this.getRedisBanDb()).hset(key, 'banned_at', Math.floor(Date.now() / 1000))
        await (await this.getRedisBanDb()).expire(key, expire)
        await (await this.getRedisBanDb()).del(failKey)
        if (incrementStage >= 0 && user) {
            await this.app.dbRepo(userRepo).update(
                {[userField]: username},
                {ban_increment_stage: incrementStage, last_banned_at: new Date(), last_banned_ip: ip},
            )
        }
    }

    async registerFailedLoginAttempt(username: string, domain: string, realm: string, ip: string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }
        const maxAttempts = this.app.config.security.login.max_attempts
        const expire = this.app.config.security.login.ban_max_time || 3600
        const key = this.loginFailKey(username, domain, realm, ip)

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

    async isUserBanned(username: string, domain: string, realm: string, ip: string): Promise<boolean> {
        if (!this.app.config.security.login.ban_enable) {
            return false
        }
        const key = `${this.loginBanBasicKey(username, domain, realm, ip)}:*`
        return keyExists(await this.getRedisBanDb(), key)
    }

    async clearFailedLoginAttempts(username: string, domain: string, realm: string, ip: string): Promise<void> {
        if (!this.app.config.security.login.ban_enable) {
            return
        }
        const key = this.loginFailKey(username, domain, realm, ip)
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

    async filterNotBannedAdmins(ids: number[]): Promise<number[]> {
        if (!this.app.config.security.login.ban_enable) {
            return []
        }
        const keys = await findKeys(await this.getRedisBanDb(), 'login:ban:*:admin_id:*')
        const bannedIds = new Set<number>()
        for (const key of keys) {
            const id = parseInt(key.split('::').find((k) => k.startsWith('admin_id:'))?.split(':')[1])
            if (id) {
                bannedIds.add(id)
            }
        }
        return ids.filter((id) => bannedIds.has(id))
    }

    async readBannedAdminIds(): Promise<number[]> {
        const keys = await findKeys(await this.getRedisBanDb(), 'login:ban:*:realm:admin:*')
        const ids = new Set<number>()
        for (const key of keys) {
            const id = parseInt(key.split('::').find((k) => k.startsWith('admin_id:'))?.split(':')[1])
            if (id) {
                ids.add(id)
            }
        }
        return Array.from(ids)
    }

    async isAdminBanned(id: number): Promise<boolean> {
        const key = `login:ban:*:admin_id:${id}:*`
        return keyExists(await this.getRedisBanDb(), key)
    }

    async removeAdminBan(id: number, sr: ServiceRequest): Promise<void> {
        this.log.debug({message: 'remove ban for admin', id: id, authority: sr.user.id})
        const keys = await findKeys(await this.getRedisBanDb(), `login:ban:*:admin_id:${id}:*`)
        if (keys.length === 0)
            return
        await (await this.getRedisBanDb()).del(...keys)
        await this.app.dbRepo(db.billing.Admin).update({id: id}, {ban_increment_stage: 0})
    }

    async filterNotBannedSubscribers(ids: number[]): Promise<number[]> {
        if (!this.app.config.security.login.ban_enable) {
            return []
        }
        const keys = await findKeys(await this.getRedisBanDb(), 'login:ban:*:subscriber_id:*')
        const bannedIds = new Set<number>()
        for (const key of keys) {
            const id = parseInt(key.split('::').find((k) => k.startsWith('subscriber_id:'))?.split(':')[1])
            if (id) {
                bannedIds.add(id)
            }
        }
        return ids.filter((id) => bannedIds.has(id))
    }

    async readBannedSubscriberIds(customerId?: number): Promise<number[]> {
        let key = 'login:ban:*:realm:subscriber:*'
        if (customerId) {
            key = `login:ban:*:realm:subscriber:*:customer_id:${customerId}:*`
        }
        const keys = await findKeys(await this.getRedisBanDb(), key)
        const ids = new Set<number>()
        for (const key of keys) {
            const id = parseInt(key.split('::').find((k) => k.startsWith('subscriber_id:'))?.split(':')[1])
            if (id) {
                ids.add(id)
            }
        }
        return Array.from(ids)
    }

    async isSubscriberBanned(id: number): Promise<boolean> {
        const key = `login:ban:*:subscriber_id:${id}:*`
        return keyExists(await this.getRedisBanDb(), key)
    }

    async removeSubscriberBan(id: number, sr: ServiceRequest): Promise<void> {
        this.log.debug({message: 'remove ban for subscriber', id: id, authority: sr.user.id})
        const keys = await findKeys(await this.getRedisBanDb(), `login:ban:*:subscriber_id:${id}:*`)
        if (keys.length === 0)
            return
        await (await this.getRedisBanDb()).del(...keys)
        const billingSubscriber = await this.app.dbRepo(db.billing.VoipSubscriber).findOne({
            where: {id: id},
            relations:['provisioningVoipSubscriber'],
        })
        if (!billingSubscriber) {
            return
        }

        await this.app.dbRepo(db.provisioning.VoipSubscriber).update(
            {id: billingSubscriber.provisioningVoipSubscriber.id},
            {ban_increment_stage: 0},
        )
    }

    loginFailKey(username: string, domain: string, realm: string, ip: string): string {
        return `login:fail::user:${username}::domain:${domain}::realm:${realm}::ip:${ip}`
    }

    loginBanBasicKey(username: string, domain: string, realm: string, ip: string): string {
        return `login:ban::user:${username}::domain:${domain}::realm:${realm}::ip:${ip}`
    }

    loginBanAdminKey(username: string, domain: string, realm: string, ip: string,
        admin_id: number, reseller_id: number): string {
        const keyBasic = this.loginBanBasicKey(username, domain, realm, ip)
        return `${keyBasic}::admin_id:${admin_id}::reseller_id:${reseller_id}`
    }

    loginBanSubscriberKey(username: string, domain: string, realm: string, ip: string,
        subscriber_id: number, customer_id: number): string {
        const keyBasic = this.loginBanBasicKey(username, domain, realm, ip)
        return `${keyBasic}::subscriber_id:${subscriber_id}::customer_id:${customer_id}`
    }

    generateOtpSecretKey(): string {
        return authenticator.generateSecret()
    }

    verifyOtp(secret: string, token: string): boolean {
        this.log.debug({message: 'verifying otp', secret: secret, token: token})
        return authenticator.verify({
            secret: secret,
            token: token,
        })
    }

    async handleTwoFactorAuth(user: db.billing.Admin, req: ServiceRequest): Promise<void> {
        if (!user.enable_2fa)
            return
        this.log.debug({message: 'starting 2fa authentication', method: this.handleTwoFactorAuth.name})

        if (!req.headers['x-totp'] && user.show_otp_registration_info) {
            this.log.debug({message: 'otp not provided, otp_init: true'})
            const isOtpAuthUrl = req.req.url.startsWith(`/${this.app.config.common.api_prefix}/auth/otp`)
            this.log.debug({message: 'is otp auth url', isOtpAuthUrl: isOtpAuthUrl})
            if (!isOtpAuthUrl) {
                this.log.debug({message: 'not otp auth url'})
                throw new ForbiddenException(
                    this.i18n.t(
                        'errors.MISSING_OTP_WITH_REFER.message',
                        {args: {refer: `/${this.app.config.common.api_prefix}/auth/otp`}},
                    ),
                )
            }
            this.log.debug({message: 'is otp auth url, letting pass'})
            return
        }

        if (!req.headers['x-totp'] || typeof req.headers['x-totp'] !== 'string')
            throw new ForbiddenException(this.i18n.t('errors.MISSING_OTP'))

        if (!this.verifyOtp(user.otp_secret, req.headers['x-totp'])) {
            this.log.debug({message: 'otp verification failed'})
            throw new ForbiddenException(this.i18n.t('errors.INVALID_OTP'))
        }

        if (user.show_otp_registration_info) {
            this.log.debug({message: 'otp verification succeeded, setting show_otp_registration_info to false'})
            user.show_otp_registration_info = false
            await user.save()
        }

        this.log.debug({message: '2fa authentication successful'})
        return
    }
}
