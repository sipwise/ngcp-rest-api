import {Injectable, Logger} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {Strategy} from 'passport-jwt'
import {jwtConstants} from '../config/constants.config'
import {db} from '../entities'
import {AuthService} from './auth.service'
import {AppService} from '../app.service'

/**
 * Implementation of the JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger: Logger
    /**
     * Extracts the JWT from the passed bearer token
     */
    constructor(
        private readonly app: AppService,
        private readonly auth: AuthService
    ) {
        super({
            jwtFromRequest: fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,

        })
        this.logger = new Logger(JwtStrategy.name)
    }

    /**
     * Validate is only called if the JWT was successfully extracted from the authentication header
     * @param payload Extracted JWT
     * @returns token User information contained in the JWT
     */
    async validate(payload: any) {
        this.logger.debug("got payload in validate " + JSON.stringify(payload))
        const admin = await this.app.dbRepo(db.billing.Admin).findOne(payload.id)
        if (!this.auth.isAdminValid(admin)) {
            return null
        }
        return this.auth.toResponse(admin)
    }
}

const re = /(\S+)\s+(\S+)/
const AUTH_HEADER = 'authorization'
const AUTH_SCHEME = 'bearer'

function parseAuthHeader(hdrValue) {
    if (typeof hdrValue !== 'string') {
        return null
    }
    const matches = hdrValue.match(re)
    return matches && {scheme: matches[1], value: matches[2]}
}

function fromAuthHeaderAsBearerToken() {
    return function (request) {
        let token = null
        let l = new Logger(fromAuthHeaderAsBearerToken.name)
        l.debug("get bearer token from auth header")
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
