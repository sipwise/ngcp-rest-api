import {CanActivate, ExecutionContext, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

@Injectable()
export class ContentTypeGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        let contentType:string | undefined = request.headers['content-type']
        if (!contentType || contentType.length === 0)
            return true
        const validTypes = this.reflector.getAllAndMerge<string[]>('validContentTypes', [
            context.getHandler(),
            context.getClass(),
        ])

        if (validTypes.length === 0)
            return true

        if (contentType.includes('multipart/form-data'))
            contentType = 'multipart/form-data'

        if (!validTypes.includes(contentType))
            throw new UnprocessableEntityException()

        return true
    }
}
