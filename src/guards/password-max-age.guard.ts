import {Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException} from '@nestjs/common'
import {AuthService} from '../auth/auth.service'
import {Request} from 'express'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {Reflector} from '@nestjs/core'
import {PublicGuard} from './public.guard'

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