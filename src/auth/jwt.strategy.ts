import {Injectable} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {ExtractJwt, Strategy} from 'passport-jwt'
import {jwtConstants} from '../config/constants.config'

/**
 * Implementation of the JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /**
     * Extracts the JWT from the passed bearer token
     */
    constructor() {
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
        return {id: payload.id, username: payload.username}
    }
}

var re = /(\S+)\s+(\S+)/
var AUTH_HEADER = "authorization"
var AUTH_SCHEME = "bearer"


function parseAuthHeader(hdrValue) {
    if (typeof hdrValue !== 'string') {
        return null;
    }
    var matches = hdrValue.match(re);
    return matches && {scheme: matches[1], value: matches[2]};
}

function fromAuthHeaderAsBearerToken() {
    return function (request) {
        var token = null;
        if (request.headers[AUTH_HEADER]) {
            var auth_params = parseAuthHeader(request.headers[AUTH_HEADER]);
            if (auth_params && AUTH_SCHEME.toLowerCase() === auth_params.scheme.toLowerCase()) {
                token = auth_params.value;

            }
        }
        return token;
    };
}
