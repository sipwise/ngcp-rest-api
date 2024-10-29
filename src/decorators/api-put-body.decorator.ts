import {Type,applyDecorators} from '@nestjs/common'
import {ApiBody, getSchemaPath} from '@nestjs/swagger'

export const ApiPutBody = <TModel extends Type<any>>(
    model: TModel,
): MethodDecorator => {
    return applyDecorators(
        ApiBody({
            schema: {
                title: `PutOf${model.name}`,
                type: 'object',
                $ref: getSchemaPath(model),
            },
        }),
    )
}
