import {CanActivate, ExecutionContext, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class ApiAcceptHeaderGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const accept:string | undefined = request.headers['accept']
        if (!accept || accept.length === 0)
            return true

        const validTypes = this.reflector.getAllAndMerge<string[]>('validAccepts', [
            context.getHandler(),
            context.getClass(),
        ])

        if (validTypes.length === 0)
            return true
        if (!validTypes.includes(accept)) {
            throw new UnprocessableEntityException()
        }

        return true
    }
}
