import {ExecutionContext, createParamDecorator} from '@nestjs/common'

import {InvalidParameterException} from '~/helpers/errors.helper'

// values taken from the body, so the pipes report their errors with pointers instead of the parameter
export const paramOrBodyFromBody = new WeakSet<object>()

export const ParamOrBody = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        if(request.params?.[data] == undefined && typeof request.body == 'object' && Object.keys(request.body).length == 0)
            throw new InvalidParameterException([{parameter: data, code: 'isNotEmpty', message: `${data} should not be empty`}])

        const paramValue = request.params?.[data]

        if (paramValue)
            return [paramValue] as string[]

        if (request.body != null && typeof request.body == 'object')
            paramOrBodyFromBody.add(request.body)
        return request.body as string
    },
)
