import {Injectable, UnauthorizedException, UnprocessableEntityException} from '@nestjs/common'
import {PassportStrategy} from '@nestjs/passport'
import {Request} from 'express'
import {BasicStrategy} from 'passport-http'
import {Strategy} from 'passport-local'


import {AuthService} from './auth.service'
import {AuthResponseDto} from './dto/auth-response.dto'

import {ServiceRequest} from '~/interfaces/service-request.interface'
import {extractUsernameDomain} from '~/helpers/auth.helper'


/**
 * Defines authentication function format
 */
interface Authenticator {
    (req:ServiceRequest, username: string, password: string, realm: string, service: AuthService): Promise<AuthResponseDto>
}

/**
 * Authentication function using `username` and `password` to validate an `Admin`
 * @param username Login username
 * @param password Login password
 * @param service AuthService that is called to validate the Admin
 */
async function pwd_auth(sr: ServiceRequest, userDomain: string, password: string, realm: string, service: AuthService): Promise<AuthResponseDto> {
    if (realm != 'admin' && realm != 'subscriber')
        throw new UnprocessableEntityException()
    const [username, domain] = extractUsernameDomain(sr, userDomain)
    if (realm == 'subscriber') {
        const subscriber = await service.validateSubscriber(sr, username, password, domain, realm)
        if (!subscriber) {
            await service.registerFailedLoginAttempt(username, domain, realm, sr.remote_ip)
            throw new UnauthorizedException()
        }
        await service.clearFailedLoginAttempts(username, domain, realm, sr.remote_ip)
        await service.resetBanIncrementStage(username, realm)
        return subscriber
    } else {
        const admin = await service.validateAdmin(sr, username, password, domain, realm)
        if (!admin) {
            await service.registerFailedLoginAttempt(username, domain, realm, sr.remote_ip)
            throw new UnauthorizedException()
        }
        await service.clearFailedLoginAttempts(username, domain, realm, sr.remote_ip)
        await service.resetBanIncrementStage(username, realm)
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
    constructor(private readonly authService: AuthService) {
        super({
            passReqToCallback: true,
        })
        this.auth = pwd_auth
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username in 'Authorization' header
     * @param password Password in 'Authorization' header
     */
    async validate(req: Request, username: string, password: string): Promise<AuthResponseDto> {
        const sr = new ServiceRequest(req)
        return await this.auth(sr, username, password, sr.realm, this.authService)
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
    constructor(private readonly authService: AuthService) {
        super({
            passReqToCallback: true,
        })
        this.auth = pwd_auth
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username from JSON
     * @param password Password from JSON
     */
    async validate(req: Request, username: string, password: string): Promise<AuthResponseDto> {
        const sr = new ServiceRequest(req)
        return await this.auth(sr, username, password, sr.realm, this.authService)
    }
}

