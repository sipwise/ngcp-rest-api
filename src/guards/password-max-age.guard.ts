import {CanActivate, ExecutionContext, ForbiddenException,Injectable, UnauthorizedException} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Request} from 'express'

import {PublicGuard} from './public.guard'

import {AuthService} from '~/auth/auth.service'
import {ServiceRequest} from '~/interfaces/service-request.interface'



@Injectable()
export class PasswordMaxAgeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const publicGuard = new PublicGuard(this.reflector)
        if (await publicGuard.canActivate(context))
            return true

        const handlerSkipMaxAge = this.reflector.get<boolean>('skipMaxAge', context.getHandler())
        const classSkipMaxAge = this.reflector.get<boolean>('skipMaxAge', context.getClass())

        if (handlerSkipMaxAge || classSkipMaxAge)
            return true

        const request = context.switchToHttp().getRequest<Request>()
        const sr = new ServiceRequest(request)

        if (!sr.user || !sr.user.password_modified_timestamp)
            throw new UnauthorizedException()

        if (sr.user.password_modified_timestamp) {
            const expired = await this.authService.isPasswordExpired(sr.user.password_modified_timestamp)
            if (expired)
                throw new ForbiddenException('Password expired')
        }

        return true
    }

}