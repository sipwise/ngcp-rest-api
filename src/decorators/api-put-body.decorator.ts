import {Type,applyDecorators} from '@nestjs/common'
import {ApiBody, getSchemaPath} from '@nestjs/swagger'

// TODO: This needs to be any, but we need to find a way to make it a generic. Maybe never type?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
