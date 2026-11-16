/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    NestInterceptor,
} from '@nestjs/common'
import {Request} from 'express'
import {Observable} from 'rxjs'
import {catchError,switchMap} from 'rxjs/operators'

import {prepareInputTimezone} from '~/helpers/date-time-input.helper'
import {renderDateTimes} from '~/helpers/date-time-renderer.helper'
import {requestTimezone} from '~/helpers/timezone.helper'
import {validate} from '~/helpers/validate.helper'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ResponseValidationInterceptor implements NestInterceptor {
    private readonly log = new LoggerService(ResponseValidationInterceptor.name)

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const req = context.switchToHttp().getRequest<Request>()
        await prepareInputTimezone(req)

        return next.handle().pipe(
            switchMap(async (data) => {
                const dto = Array.isArray(data) && data.length > 0 ? data[0] : data
                if (typeof dto !== 'object')
                    return data
                const validationErrors = await validate(dto)
                if (validationErrors.length > 0) {
                    this.log.error({message: 'Response validation failed', validationErrors})
                    throw new InternalServerErrorException()
                }
                await renderDateTimes(data, requestTimezone(req))
                return data
            }),
            catchError((err) => {
                throw err
            }),
        )
    }
}