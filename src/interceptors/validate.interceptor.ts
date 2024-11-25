/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    NestInterceptor,
} from '@nestjs/common'
import {validate} from 'class-validator'
import {Observable} from 'rxjs'
import {catchError,switchMap} from 'rxjs/operators'

import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ResponseValidationInterceptor implements NestInterceptor {
    private readonly log = new LoggerService(ResponseValidationInterceptor.name)

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const _ctx = context.switchToHttp()

        return next.handle().pipe(
            switchMap(async (data) => {
                if (Array.isArray(data)) {
                    const responseList = data[0]
                    for (const item of responseList) {
                        const validationErrors = await validate(item)
                        if (validationErrors.length > 0) {
                            this.log.error({message: 'Response validation failed', validationErrors})
                            throw new InternalServerErrorException()
                        }
                    }
                    return data
                } else {
                    const validationErrors = await validate(data)
                    if (validationErrors.length > 0) {
                        this.log.error({message: 'Response validation failed', validationErrors})
                        throw new InternalServerErrorException()
                    }
                    return data
                }
            }),
            catchError((err) => {
                throw err
            }),
        )
    }
}