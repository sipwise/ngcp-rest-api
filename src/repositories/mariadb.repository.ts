import {HandleDbErrors} from '../decorators/handle-db-errors.decorator'

export abstract class MariaDbRepository {
    /*  We need this as a constructor because the scope is limited to the calling class.
        This means the children classses will call this constructor and apply the HandleDbErrors decorator to all methods 
    */
    constructor() {
        const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(
            methodName => methodName !== 'constructor' && typeof (this as unknown)[methodName] === 'function',
        )

        for (const methodName of methodNames) {
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), methodName)
            if (descriptor) {
                HandleDbErrors(this, methodName, descriptor)
                Object.defineProperty(Object.getPrototypeOf(this), methodName, descriptor)
            }
        }
    }
}
