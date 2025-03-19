import {ExecutionContext,createParamDecorator} from '@nestjs/common'
import {PipeTransform} from '@nestjs/common'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function BodyOrEmptyArray(pipe?: PipeTransform) {
    return createParamDecorator((_, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        const body = request.body

        if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
            return []
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return pipe ? pipe.transform(body, {type: 'body'}) : body
    })()
}
