import {SetMetadata} from '@nestjs/common'

/**
 * Metadata-only replacement for typeorm-transactional's `@Transactional()`.
 *
 * Unlike typeorm-transactional's decorator, this one does nothing by
 * itself, it only attaches metadata. All actual transaction handling
 * (starting it, committing/rolling back, running post-commit callbacks)
 * goes in TransactionInterceptor, which reads this metadata via
 * Reflector.
 */
export const TRANSACTIONAL_KEY = Symbol('transactional')

export const Transactional = (): MethodDecorator & ClassDecorator =>
    SetMetadata(TRANSACTIONAL_KEY, true)
