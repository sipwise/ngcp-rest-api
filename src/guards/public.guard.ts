import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class PublicGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {
    }

    canActivate(context: ExecutionContext): boolean {
        const isPublicMethod = this.reflector.get<boolean>(
            'isPublic',
            context.getHandler(),
        )
        const isPublicController = this.reflector.get<boolean>(
            'isPublic',
            context.getClass(),
        )

        return isPublicMethod === undefined ? isPublicController
            : isPublicMethod
    }
}
