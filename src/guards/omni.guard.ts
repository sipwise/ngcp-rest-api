import {ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {AuthGuard} from '@nestjs/passport'

import {PublicGuard} from './public.guard'

class OmniBodyCredentialsGuard extends AuthGuard(['jwt', 'cert-header', 'basic', 'local']) {
}

@Injectable()
export class OmniGuard extends AuthGuard(['jwt', 'cert-header', 'basic']) {
    constructor(private readonly reflector: Reflector) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        if (request.user && request.user.role) // already authenticated
            return true
        const publicGuard = new PublicGuard(this.reflector)
        if (await publicGuard.canActivate(context))
            return true

        const allowBodyCredentials = this.reflector.getAllAndOverride<boolean>(
            'allowBodyCredentials', [context.getHandler(), context.getClass()],
        )
        if (allowBodyCredentials)
            return await new OmniBodyCredentialsGuard().canActivate(context) ? true : false

        return await super.canActivate(context) ? true : false
    }
}
