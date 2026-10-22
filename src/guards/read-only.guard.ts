import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class ReadOnlyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        if (!request.user || !request.user.readOnly) {
            return true
        }

        const handlerSkipReadOnly = this.reflector.get<boolean>('skipReadOnly', context.getHandler())
        const classSkipReadOnly = this.reflector.get<boolean>('skipReadOnly', context.getClass())

        if (handlerSkipReadOnly || classSkipReadOnly)
            return true

        return request.method.toLowerCase() === 'get'
    }
}
