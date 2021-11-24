import {Injectable, UnauthorizedException} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {ServiceRequest} from 'interfaces/service-request.interface'
import {BasicStrategy} from 'passport-http'
import {Strategy} from 'passport-local'
import {AuthService} from './auth.service'
import {AuthResponseDto} from './dto/auth-response.dto'

/**
 * Defines authentication function format
 */
interface Authenticator {
    (username: string, password: string, realm: string, service: AuthService): Promise<AuthResponseDto>
}

/**
 * Authentication function using `username` and `password` to validate an `Admin`
 * @param username Login username
 * @param password Login password
 * @param service AuthService that is called to validate the Admin
 */
async function pwd_auth(username: string, password: string, realm: string, service: AuthService): Promise<AuthResponseDto> {
    if (realm == 'subscriber') {
        const userInfo = username.split('@')
        if (userInfo.length != 2)
            throw new UnauthorizedException()
        const subscriber = await service.validateSubscriber(userInfo[0], userInfo[1], password)
        if (!subscriber) {
            throw new UnauthorizedException()
        }
        return subscriber
    } else {
        const admin = await service.validateAdmin(username, password)
        if (!admin) {
            throw new UnauthorizedException()
        }
        return admin
    }
}

/**
 * Implementation of Basic authentication strategy by HTTP 'Authorization' header
 */
@Injectable()
export class BasicHTTPStrategy extends PassportStrategy(BasicStrategy) {
    auth: Authenticator

    /**
     * Creates a new `BasicHTTPStrategy` and sets the authentication method to [`pwd_auth`]{@link pwd_auth}.
     * @param authService AuthService to validate the Admin
     */
    constructor(private authService: AuthService) {
        super({
            passReqToCallback: true
        })
        this.auth = pwd_auth
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username in 'Authorization' header
     * @param password Password in 'Authorization' header
     */
    async validate(req: ServiceRequest, username: string, password: string): Promise<AuthResponseDto> {
        let realm = 'admin'
        if ('x-auth-realm' in req.headers)
            realm = req.headers['x-auth-realm']
        return await this.auth(username, password, realm, this.authService)
    }
}

/**
 * Implementation of Basic authentication strategy from JSON data
 */
@Injectable()
export class BasicJSONStrategy extends PassportStrategy(Strategy) {
    auth: Authenticator

    /**
     * Creates a new `BasicJSONStrategy` and sets the authentication method that is used.
     * @param authService AuthService to validate the Admin
     */
    constructor(private authService: AuthService) {
        super({
            passReqToCallback: true
        })
        this.auth = pwd_auth
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username from JSON
     * @param password Password from JSON
     */
    async validate(req: ServiceRequest, username: string, password: string): Promise<AuthResponseDto> {
        let realm = 'admin'
        if ('x-auth-realm' in req.headers)
            realm = req.headers['x-auth-realm']
        return await this.auth(username, password, realm, this.authService)
    }
}

