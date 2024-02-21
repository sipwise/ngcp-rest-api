import {applyDecorators, Type} from '@nestjs/common'
import {ApiBody, getSchemaPath} from '@nestjs/swagger'

export const ApiPutBody = <TModel extends Type<any>>(
    model: TModel,
) => {
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
