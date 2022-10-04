import {handleTypeORMError} from '../helpers/errors.helper'
import {LoggerService} from '../logger/logger.service'

export function HandleDbErrors(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const log = new LoggerService(HandleDbErrors.name)
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
