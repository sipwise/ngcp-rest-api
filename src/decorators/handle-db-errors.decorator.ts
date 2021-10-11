import {Logger} from '@nestjs/common'
import {handleTypeORMError} from '../helpers/errors.helper'

export function HandleDbErrors(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const log = new Logger()
    const fn = descriptor.value
    descriptor.value = async function DescriptorValue(...args: any[]) {
        try {
            const result = await fn.apply(this, args)
            if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                return result.catch((err: any) => {
                    log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
                    throw handleTypeORMError(err)
                })
            }
            return result
        } catch (err) {
            log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
            throw handleTypeORMError(err)
        }
    }
    return descriptor
}
