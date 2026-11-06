import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Observable, lastValueFrom, of} from 'rxjs'
import {runInTransaction} from 'typeorm-transactional'

import {TRANSACTIONAL_KEY} from '~/decorators/transactional.decorator'
import {TransactionConflictException} from '~/helpers/errors.helper'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {LoggerService} from '~/logger/logger.service'

const MAX_ATTEMPTS = 3

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    private readonly log = new LoggerService(TransactionInterceptor.name)

    constructor(private readonly reflector: Reflector) {
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const isTransactional = this.reflector.getAllAndOverride<boolean>(
            TRANSACTIONAL_KEY,
            [context.getHandler(), context.getClass()],
        )
        if (!isTransactional) {
            return next.handle()
        }

        for (let attempt = 1; ; attempt++) {
            try {
                return of(await this.runTransaction(next))
            } catch (err) {
                if (!(err instanceof TransactionConflictException) || attempt >= MAX_ATTEMPTS)
                    throw err
                this.log.warn(`transaction conflict, retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50 * attempt))
            }
        }
    }

    private async runTransaction(next: CallHandler): Promise<unknown> {
        let result: unknown
        await postCommitQueueStorage.run({callbacks: []}, async () => {
            await runInTransaction(async () => {
                result = await lastValueFrom(next.handle())
            })
            const store = postCommitQueueStorage.getStore()
            if (!store) {
                throw new Error('post-commit queue store missing after commit - this should never happen')
            }
            for (const cb of store.callbacks) {
                try {
                    await cb()
                } catch (err) {
                    this.log.error({message: 'post-commit callback failed', err})
                }
            }
        })
        return result
    }
}
