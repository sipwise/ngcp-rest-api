import {handleTypeORMError} from '~/helpers/errors.helper'
import {LoggerService} from '~/logger/logger.service'

function applyDecorator(target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const log = new LoggerService(`${target.constructor.name}/${propertyKey}`)
    const originalMethod = descriptor.value

    // TODO: Fix this function type hint
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    descriptor.value = async function (...args: unknown[]) {
        try {
            const result = await originalMethod.apply(this, args)
            if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                // TODO: Fix this mess if fixable
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return result.catch((err: Error) => {
                    log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
                    throw handleTypeORMError(err)
                })
            }
            // TODO: Fix this any if fixable
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return result
        } catch (err) {
            log.error(err, err.stack, `${target.constructor.name}/${propertyKey}`)
            throw handleTypeORMError(err)
        }
    }
    return descriptor
}

export function HandleDbErrors(...args: unknown[]): unknown {
    if (args.length === 1) {
        // Class decorator logic
        const [constructor] = args

        if (typeof constructor !== 'function') {
            throw new Error('Class decorator HandleDbErrors must be applied to a class')
        }

        const methodNames = Object.getOwnPropertyNames(constructor.prototype).filter(
            methodName => methodName !== 'constructor' && typeof constructor.prototype[methodName] === 'function',
        )

        for (const methodName of methodNames) {
            const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName)
            if (descriptor) {
                const wrappedDescriptor = applyDecorator(constructor.prototype, methodName, descriptor)
                Object.defineProperty(constructor.prototype, methodName, wrappedDescriptor)
            }
        }
        return constructor
    } else {
        // Method decorator logic
        return applyDecorator(...args as [unknown, string, PropertyDescriptor])
    }
}
