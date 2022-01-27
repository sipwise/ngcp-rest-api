import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class PublicGuard implements CanActivate {
    constructor(private reflector: Reflector) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
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
