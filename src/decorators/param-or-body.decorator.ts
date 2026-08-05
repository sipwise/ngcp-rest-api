import {BadRequestException, ExecutionContext, createParamDecorator} from '@nestjs/common'

export const ParamOrBody = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        if(request.params?.[data] == undefined && typeof request.body == 'object' && Object.keys(request.body).length == 0)
            throw new BadRequestException('params and body are undefined')

        const paramValue = request.params?.[data]

        if (paramValue)
            return [paramValue] as string[]

        return request.body as string
    },
)