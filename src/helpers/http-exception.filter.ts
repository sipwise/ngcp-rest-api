import {ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger} from '@nestjs/common'
import {Request, Response} from 'express'
import Context from '../helpers/context.helper'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly log = new Logger(HttpExceptionFilter.name)

    catch(exception: any, host: ArgumentsHost): any {
        const httpContext = host.switchToHttp()
        const response = httpContext.getResponse<Response>()
        const request = httpContext.getRequest<Request>()
        const status = exception.getStatus()

        const ctx = Context.get(request)

        const user: any = request.user // this is required because we cannot typecast to AuthResponseDto here

        const now = Date.now()

        this.log.log({
            message: 'RESPONSE',
            tx: ctx.txid,
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
            received_at: ctx.startTime,
            response_at: now,
            elapsed: now - ctx.startTime,
            body: exception.response,
        })
        response.status(status).json({
            tx: ctx.txid,
            statusCode: status,
            path: request.url,
            error: exception.response.error,
            message: exception.response.message,
        })
    }
}