import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {PublicGuard} from './public.guard'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = new PublicGuard(this.reflector)
        if (await isPublic.canActivate(context))
            return true
        const roles = this.reflector.getAllAndMerge<string[]>('rbacroles', [
            context.getHandler(),
            context.getClass(),
        ])
        if (roles.length == 0) {
            return true
        }
        const request = context.switchToHttp().getRequest()
        return roles.includes(request.user.role)
    }
}
