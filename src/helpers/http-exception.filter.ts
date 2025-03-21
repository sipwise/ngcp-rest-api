import {ArgumentsHost, Catch, ExceptionFilter, HttpException} from '@nestjs/common'
import {Request, Response} from 'express'

import {config} from '~/config/main.config'
import Context from '~/helpers/context.helper'
import {LoggerService} from '~/logger/logger.service'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly log = new LoggerService(HttpExceptionFilter.name)

    // TODO: Is there a type-safe way to catch exceptions?
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch(exception: any, host: ArgumentsHost): void {
        const httpContext = host.switchToHttp()
        const response = httpContext.getResponse<Response>()
        const request = httpContext.getRequest<Request>()
        const status = exception.getStatus()

        const ctx = Context.get(request)

        // TODO: This is required because we cannot typecast to AuthResponseDto here
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = request.user

        const now = Date.now()

        this.log.log({
            message: 'RESPONSE',
            tx: ctx != null ? ctx.txid : '',
            username: request['user'] !== undefined ? user.username : 'unknown',
            role: {
                role: request['user'] !== undefined ? user.role : 'unknown',
                is_master: request['user'] !== undefined ? user.is_master : 'unknown',
            },
            ip: request.ip,
            url: `${request.protocol}://${request.header('host')}${request.url}`,
            query_params: request.query,
            content_type: request.header('content-type'),
            method: request.method,
            received_at: ctx != null ? ctx.startTime : now,
            response_at: now,
            elapsed: ctx != null ? now - ctx.startTime : 0,
            body: exception.response,
        })
        const message = exception.response.description ? exception.response.description :
            config.legacy.errors ? JSON.stringify(exception.response.message) : exception.response.message
        response.status(status).json({
            tx: ctx != null ? ctx.txid : '',
            statusCode: status,
            path: request.url,
            method: request.method,
            error: exception.response.errorCode || exception.response.error,
            message: message,
        })
    }
}