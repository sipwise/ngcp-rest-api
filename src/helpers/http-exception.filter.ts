import {STATUS_CODES} from 'http'

import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from '@nestjs/common'
import {AbstractHttpAdapter} from '@nestjs/core'
import {Request, Response} from 'express'

import Context from '~/helpers/context.helper'
import {ErrorCode, ErrorEntry} from '~/helpers/errors.helper'
import {obfuscatePasswordQuery, obfuscatePasswordUrl} from '~/helpers/password-obfuscator.helper'
import {LoggerService} from '~/logger/logger.service'

interface ErrorBody {
    statusCode: number
    errorCode: string
    message: string
    errors?: ErrorEntry[]
}

// errors of the body parser (http-errors), e.g. malformed JSON, too large or unsupported encoding
interface ParserError extends Error {
    type: string
    status: number
    expose: boolean
}

function isParserError(exception: unknown): exception is ParserError {
    const err = exception as ParserError
    return err instanceof Error && typeof err.status == 'number' && typeof err.type == 'string' && err.expose === true
}

/**
 * The express adapter maps body parser errors (SyntaxError) to a plain BadRequestException; keep them,
 * so the filter can tell malformed JSON (INVALID_JSON) from other bad requests
 */
export function keepBodyParserErrors(adapter: AbstractHttpAdapter): void {
    if (!adapter)
        return
    const mapException = adapter.mapException.bind(adapter)
    adapter.mapException = (error: unknown): unknown => isParserError(error) ? error : mapException(error)
}

function statusName(status: number): string {
    return HttpStatus[status] ?? STATUS_CODES[status]?.toUpperCase().replace(/[^A-Z0-9]+/g, '_') ?? 'ERROR'
}

function messageToString(message: unknown, status: number): string {
    if (typeof message == 'string' && message != '')
        return message
    if (Array.isArray(message) && message.length)
        return message.map(m => typeof m == 'string' ? m : JSON.stringify(m)).join('; ')
    return STATUS_CODES[status] ?? 'Error'
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly log = new LoggerService(HttpExceptionFilter.name)

    private toErrorBody(exception: unknown): ErrorBody {
        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus()
            const response = exception.getResponse()
            if (typeof response == 'string')
                return {statusCode, errorCode: exception.errorCode ?? statusName(statusCode), message: messageToString(response, statusCode)}
            const body = response as Record<string, unknown>
            return {
                statusCode,
                errorCode: (body.errorCode as string) ?? exception.errorCode ?? statusName(statusCode),
                message: messageToString(body.message, statusCode),
                errors: body.errors as ErrorEntry[],
            }
        }
        if (isParserError(exception)) {
            return {
                statusCode: exception.status,
                errorCode: exception.type == 'entity.parse.failed' ? ErrorCode.INVALID_JSON : statusName(exception.status),
                message: exception.message,
            }
        }
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorCode: statusName(HttpStatus.INTERNAL_SERVER_ERROR),
            message: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
        }
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const httpContext = host.switchToHttp()
        const response = httpContext.getResponse<Response>()
        const request = httpContext.getRequest<Request>()
        const ctx = Context.get(request)
        const tx = ctx != null ? ctx.txid : ''
        const body = this.toErrorBody(exception)

        // TODO: This is required because we cannot typecast to AuthResponseDto here
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = request.user

        const now = Date.now()

        if (body.statusCode >= 500 && !(exception instanceof HttpException)) {
            this.log.error({
                message: 'UNHANDLED EXCEPTION',
                tx: tx,
                error: exception instanceof Error ? exception.message : `${exception}`,
                stack: exception instanceof Error ? exception.stack : undefined,
            })
        }

        this.log.log({
            message: 'RESPONSE',
            tx: tx,
            username: request['user'] !== undefined ? user.username : 'unknown',
            role: {
                role: request['user'] !== undefined ? user.role : 'unknown',
                is_master: request['user'] !== undefined ? user.is_master : 'unknown',
            },
            ip: request.ip,
            url: `${request.protocol}://${request.header('host')}${obfuscatePasswordUrl(request.url)}`,
            query_params: obfuscatePasswordQuery(request.query),
            content_type: request.header('content-type'),
            method: request.method,
            received_at: ctx != null ? ctx.startTime : now,
            response_at: now,
            elapsed: ctx != null ? now - ctx.startTime : 0,
            body: body,
        })

        if (response.headersSent)
            return

        response.status(body.statusCode).json({
            tx: tx,
            statusCode: body.statusCode,
            path: obfuscatePasswordUrl(request.url),
            method: request.method,
            error: STATUS_CODES[body.statusCode] ?? 'Error',
            errorCode: body.errorCode,
            message: body.message,
            ...(body.errors?.length ? {errors: body.errors} : {}),
        })
    }
}
