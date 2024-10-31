import {InternalServerErrorException} from '@nestjs/common'

import {LoggerService} from '~/logger/logger.service'

export function HandleRedisErrors(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor {
    const log = new LoggerService(HandleRedisErrors.name)
    const fn = descriptor.value
    // TODO: Fix this function type hint
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    descriptor.value = async function DescriptorValue(...args: unknown[]) {
        try {
            const result = await fn.apply(this, args)
            if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                // TODO: Fix this mess if fixable
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return result.catch((err: Error) => {
                    log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
                    throw new InternalServerErrorException('Could not process request')
                })
            }
            // TODO: Fix this any if fixable
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return result
        } catch (err) {
            log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
            throw new InternalServerErrorException('Could not process request')
        }
    }
    return descriptor
}
