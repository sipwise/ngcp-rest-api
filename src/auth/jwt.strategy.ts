import {Injectable} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {Request} from 'express'
import {ServiceRequest} from 'interfaces/service-request.interface'
import {Strategy} from 'passport-jwt'

import {AuthService} from './auth.service'
import {AuthResponseDto} from './dto/auth-response.dto'

import {AppService} from '~/app.service'
import {jwtConstants} from '~/config/constants.config'
import {db} from '~/entities'
import {LoggerService} from '~/logger/logger.service'

/**
 * Implementation of the JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly log = new LoggerService(JwtStrategy.name)

    /**
     * Extracts the JWT from the passed bearer token
     */
    constructor(
        private readonly app: AppService,
        private readonly auth: AuthService,
    ) {
        super({
            passReqToCallback: true,
            jwtFromRequest: fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        })
    }

    /**
     * Validate is only called if the JWT was successfully extracted from the authentication header
     * @param req ServiceRequest
     * @param payload Extracted JWT
     * @returns token User information contained in the JWT
     */
    // TODO: Can we use a payload type here?
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async validate(req: Request, payload: any): Promise<AuthResponseDto> {
        if (!payload)
            return null
        const sr: ServiceRequest = new ServiceRequest(req)
        this.log.debug('got JWT payload in validate ' + JSON.stringify(payload))
        if (sr.realm == 'subscriber') {
            if (!('subscriber_uuid' in payload))
                return null
            const subscriber = await this.app.dbRepo(db.provisioning.VoipSubscriber).findOne({
                where: {
                    uuid: payload.subscriber_uuid,
                },
                relations: [
                    'domain',
                    'contract',
                    'contract.contact',
                    'billing_voip_subscriber',
                ],
            })
            if (!this.auth.isSubscriberValid(subscriber)) {
                return null
            }
            return this.auth.subscriberAuthToResponse(subscriber)
        } else {
            if (!('id' in payload))
                return null
            const admin = await this.app.dbRepo(db.billing.Admin).findOne({
                where: {
                    id: payload.id,
                },
                relations: ['role'],
            })
            const role = await this.app.dbRepo(db.billing.AclRole).findOne({
                where: {
                    id: admin.role.id,
                },
                relations: ['has_access_to'],
            })
            admin.role = role
            if (!this.auth.isAdminValid(admin)) {
                return null
            }
            await this.auth.handleTwoFactorAuth(admin, sr)
            return this.auth.adminAuthToResponse(admin)
        }
    }
}

const re = /(\S+)\s+(\S+)/
const AUTH_HEADER = 'authorization'
const AUTH_SCHEME = 'bearer'

function parseAuthHeader(hdrValue): { scheme: string, value: string } {
    if (typeof hdrValue !== 'string') {
        return null
    }
    const matches = hdrValue.match(re)
    return matches && {scheme: matches[1], value: matches[2]}
}

function fromAuthHeaderAsBearerToken() {
    return function (request): unknown {
        let token = null
        const l = new LoggerService(fromAuthHeaderAsBearerToken.name)
        l.debug('get bearer token from auth header')
        if (request.headers[AUTH_HEADER]) {
            const auth_params = parseAuthHeader(request.headers[AUTH_HEADER])
            if (auth_params && AUTH_SCHEME.toLowerCase() === auth_params.scheme.toLowerCase()) {
                token = auth_params.value
                l.debug('successfully parsed token ' + token)
                l.debug('if auth failed the token is invalid')
            }
        }
        return token
    }
}
