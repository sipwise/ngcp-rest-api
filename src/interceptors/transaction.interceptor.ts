import {CallHandler, ExecutionContext, Injectable, InternalServerErrorException, NestInterceptor} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Observable, lastValueFrom, of} from 'rxjs'
import {runInTransaction} from 'typeorm-transactional'

import {TRANSACTIONAL_KEY} from '~/decorators/transactional.decorator'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {LoggerService} from '~/logger/logger.service'

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

        let result: unknown
        await postCommitQueueStorage.run({callbacks: []}, async () => {
            await runInTransaction(async () => {
                result = await lastValueFrom(next.handle())
            })
            const store = postCommitQueueStorage.getStore()
            if (!store) {
                throw new InternalServerErrorException(
                    'Internal error: post-commit queue store missing after commit - this should never happen',
                )
            }
            for (const cb of store.callbacks) {
                try {
                    await cb()
                } catch (err) {
                    this.log.error({message: 'post-commit callback failed', err})
                }
            }
        })

        return of(result)
    }
}
