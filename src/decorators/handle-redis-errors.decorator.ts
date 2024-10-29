import {InternalServerErrorException} from '@nestjs/common'

import {LoggerService} from '~/logger/logger.service'

export function HandleRedisErrors(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor {
    const log = new LoggerService(HandleRedisErrors.name)
    const fn = descriptor.value
    // TODO: Fix this function type hint
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    descriptor.value = async function DescriptorValue(...args: any[]) {
        try {
            const result = await fn.apply(this, args)
            if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                return result.catch((err: any) => {
                    log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
                    throw new InternalServerErrorException('Could not process request')
                })
            }
            return result
        } catch (err) {
            log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
            throw new InternalServerErrorException('Could not process request')
        }
    }
    return descriptor
}
