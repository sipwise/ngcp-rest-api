import {Injectable, CanActivate, ExecutionContext, ForbiddenException} from '@nestjs/common'
import {AuthService} from '../auth/auth.service'
import {Request} from 'express'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {Reflector} from '@nestjs/core'

import {I18nService} from 'nestjs-i18n'

import {PublicGuard} from './public.guard'

@Injectable()
export class BanGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
        private readonly i18n: I18nService,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const publicGuard = new PublicGuard(this.reflector)
        if (await publicGuard.canActivate(context))
            return true // Public routes are allowed to pass

        const request = context.switchToHttp().getRequest<Request>()
        const sr = new ServiceRequest(request)

        let realm = 'admin'
        if ('x-auth-realm' in sr.headers) {
            realm = sr.headers['x-auth-realm']
        }

        let username = this.extractUsername(sr)
        if (!username) {
            return true // Didnt find a username, let it pass for other guards to handle
        }

        let domain = sr.req.header('host') || 'ngcp-rest-api'
        if (realm == 'subscriber') {
            const userInfo = username.split('@')
            if (userInfo.length != 2)
                return true // Invalid username, let it pass for other guards to handle
            username = userInfo[0]
            domain = userInfo[1]
        }

        if (await this.authService.isUserBanned(username, domain, realm, sr.req.ip)) {
            throw new ForbiddenException(this.i18n.t('errors.AUTH_BANNED'))
        }

        // Allow request to proceed
        return true
    }

    private extractUsername(sr: ServiceRequest): string | null {
        const authHeader = sr.headers['authorization'] || ''

        // Handle JWT token (Bearer token)
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            return this.extractUsernameFromJwt(token)
        }

        // Handle Basic Auth
        if (authHeader.startsWith('Basic ')) {
            const base64Credentials = authHeader.split(' ')[1]
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
            const [username] = credentials.split(':')
            return username
        }

        return null
    }

    private extractUsernameFromJwt(token: string): string | null {
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('ascii'))
            return payload.username || null
        } catch (err) {
            return null
        }
    }
}
