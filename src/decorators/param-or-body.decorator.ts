import {BadRequestException, ExecutionContext, createParamDecorator} from '@nestjs/common'

export const ParamOrBody = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        if(request.params?.[data] == undefined && typeof request.body == 'object' && Object.keys(request.body).length == 0)
            throw new BadRequestException('params and body are undefined')
        if(request.params?.[data] != undefined && (typeof request.body != 'object' || Object.keys(request.body).length != 0))
            throw new BadRequestException('params and body are defined')

        // TODO: Fix unsafe return
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return request.params?.[data] ? [request.params[data]] : request.body
    },
)