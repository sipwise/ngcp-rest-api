import {Injectable} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {ExtractJwt, Strategy} from 'passport-jwt'
import {jwtConstants} from '../config/constants.config'
import {db} from '../entities'
import {AuthService} from './auth.service'
import {AppService} from '../app.service'

/**
 * Implementation of the JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /**
     * Extracts the JWT from the passed bearer token
     */
    constructor(
        private readonly app: AppService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,

        })
    }

    /**
     * Validate is only called if the JWT was successfully extracted from the authentication header
     * @param payload Extracted JWT
     * @returns token User information contained in the JWT
     */
    async validate(payload: any) {
        // TODO: fetch Admin from DB to set correct permissons for user object

        const admin = await this.app.dbRepo(db.billing.Admin).findOne(payload.id)
        if (!AuthService.isAdminValid(admin)) {
            return null
        }
        return AuthService.toResponse(admin)
        // TODO: return AuthResponseDto generated from payload
    }
}

var re = /(\S+)\s+(\S+)/
var AUTH_HEADER = 'authorization'
var AUTH_SCHEME = 'bearer'

function parseAuthHeader(hdrValue) {
    if (typeof hdrValue !== 'string') {
        return null
    }
    var matches = hdrValue.match(re)
    return matches && {scheme: matches[1], value: matches[2]}
}

function fromAuthHeaderAsBearerToken() {
    return function (request) {
        var token = null
        if (request.headers[AUTH_HEADER]) {
            var auth_params = parseAuthHeader(request.headers[AUTH_HEADER])
            if (auth_params && AUTH_SCHEME.toLowerCase() === auth_params.scheme.toLowerCase()) {
                token = auth_params.value

            }
        }
        return token
    }
}
