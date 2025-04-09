import {CanActivate,ExecutionContext,Injectable,UnprocessableEntityException} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class ApiAcceptHeaderGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const accept: string | undefined = request.headers['accept']

        // Allow if no Accept header is sent
        if (!accept || accept.length === 0)
            return true

        const clientTypes = accept
            .split(',')
            .map((type) => type.trim())
            .filter((type) => type.length > 0)

        const validTypes = this.reflector.getAllAndMerge<string[]>('validAccepts', [
            context.getHandler(),
            context.getClass(),
        ]) || []

        if (validTypes.length === 0)
            return true

        const isValid = clientTypes.some((t) =>
            validTypes.includes(t),
        )

        if (!isValid) {
            throw new UnprocessableEntityException()
        }
        return true
    }
}