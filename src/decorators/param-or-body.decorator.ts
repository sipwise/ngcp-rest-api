import {BadRequestException, createParamDecorator, ExecutionContext} from '@nestjs/common'

export const ParamOrBody = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        if(request.params?.[data] == undefined && typeof request.body == 'object' && Object.keys(request.body).length == 0)
            throw new BadRequestException('params and body are undefined')
        if(request.params?.[data] != undefined && (typeof request.body != 'object' || Object.keys(request.body).length != 0))
            throw new BadRequestException('params and body are defined')
        return request.params?.[data] ? [request.params[data]] : request.body
    },
)