import {ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {AuthGuard} from '@nestjs/passport'
import {PublicGuard} from './public.guard'

@Injectable()
export class OmniGuard extends AuthGuard(['jwt', 'cert-header', 'basic', 'local']) {
    constructor(private readonly reflector: Reflector) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const publicGuard = new PublicGuard(this.reflector)
        if (await publicGuard.canActivate(context))
            return true

        return await super.canActivate(context) ? true : false
    }
}
