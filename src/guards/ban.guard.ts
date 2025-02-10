import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Request} from 'express'
import {I18nService} from 'nestjs-i18n'

import {PublicGuard} from './public.guard'

import {AuthService} from '~/auth/auth.service'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {extractUsername, extractUsernameDomain} from '~/helpers/auth.helper'

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

        let userDomain = extractUsername(sr)
        if (!userDomain) {
            return true // Didnt find a username, let it pass for other guards to handle
        }

        const [username, domain] = extractUsernameDomain(sr, userDomain)

        if (await this.authService.isUserBanned(username, domain, sr.realm, sr.remote_ip))
            throw new ForbiddenException(this.i18n.t('errors.AUTH_BANNED'))

        // Allow request to proceed
        return true
    }

}
