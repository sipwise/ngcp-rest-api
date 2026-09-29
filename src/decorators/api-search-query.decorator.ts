import {Type} from '@nestjs/common'
import {ApiQuery, DECORATORS} from '@nestjs/swagger'

export const ApiSearchQuery = (...types: Type<any>[]): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
        for (const type of types) {
            const prototype = type.prototype
            const propertyKeys: string[] =
                Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, prototype) || []
            for (const key of propertyKeys) {
                if (key.charAt(0) !== ':')
                    continue
                const propertyName = key.slice(1)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const metadata: any =
                    Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, prototype, propertyName) || {}
                ApiQuery({
                    ...metadata,
                    name: metadata.name || propertyName,
                    required: false,
                })(target, propertyKey, descriptor)
            }
        }
        return descriptor
    }
}
