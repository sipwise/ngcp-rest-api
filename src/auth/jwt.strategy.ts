import {Injectable} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {Request} from 'express'
import {ServiceRequest} from 'interfaces/service-request.interface'
import {Strategy, StrategyOptionsWithRequest} from 'passport-jwt'

import {AuthService} from './auth.service'
import {AuthResponseDto} from './dto/auth-response.dto'

import {AuthTokenRedisRepository} from '~/api/auth/tokens/repositories/token.redis.repository'
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
        private readonly authTokenRepo: AuthTokenRedisRepository,
    ) {
        const opt: StrategyOptionsWithRequest = {
            passReqToCallback: true,
            jwtFromRequest: fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        }
        super(opt)
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
        const reqPath = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
        if ('auth_token' in payload && !reqPath.endsWith('/auth/jwt')) {
            this.log.debug('auth token payload is only allowed for /auth/jwt, got ' + req.path)
            return null
        }
        let authResponse: AuthResponseDto
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
                this.log.debug('subscriber auth failed the token is invalid')
                return null
            }
            authResponse = this.auth.subscriberAuthToResponse(subscriber)
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
                this.log.debug('admin auth failed the token is invalid')
                return null
            }
            authResponse = this.auth.adminAuthToResponse(admin)
        }

        if ('auth_token' in payload) {
            if (!('token_id' in payload)) {
                this.log.debug('persistent auth token payload is missing token_id, treating as invalid')
                return null
            }
            sr.user = authResponse
            const token = await this.authTokenRepo.readById(payload.token_id, sr)
            if (!token) {
                this.log.debug('persistent auth token no longer exists in redis, treating as invalid: ' + payload.token_id)
                return null
            }
        }

        return authResponse
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
    return function (request: Request): string | null {
        let token:  string | null = null
        this.log.debug('get bearer token from auth header')
        if (request.headers[AUTH_HEADER]) {
            const auth_params = parseAuthHeader(request.headers[AUTH_HEADER])
            if (auth_params && AUTH_SCHEME.toLowerCase() === auth_params.scheme.toLowerCase()) {
                token = auth_params.value
                this.log.debug('successfully parsed token ' + token)
            }
        }
        return token
    }
}
