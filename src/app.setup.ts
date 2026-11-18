import {INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import bodyParser from 'body-parser'

import {AppService} from './app.service'
import {HttpExceptionFilter} from './helpers/http-exception.filter'
import {bodyLimit} from './helpers/request-limits.helper'
import {ExpandInterceptor} from './interceptors/expand.interceptor'
import {LazyFieldInterceptor} from './interceptors/lazy-field.interceptor'
import {LoggingInterceptor} from './interceptors/logging.interceptor'
import {ResponseSerializerInterceptor} from './interceptors/response-serializer.interceptor'
import {ResponseValidationInterceptor} from './interceptors/response-validation.interceptor'
import {TransactionInterceptor} from './interceptors/transaction.interceptor'
import {TransformInterceptor} from './interceptors/transform.interceptor'
import {ValidateInputPipe} from './pipes/validate.pipe'

// request handling shared by main.ts and the e2e specs
export function setupApp(app: INestApplication): void {
    const config = AppService.config

    app.useGlobalPipes(
        new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: true,
        }),
    )

    app.useGlobalFilters(new HttpExceptionFilter())

    app.useGlobalInterceptors(
        new TransformInterceptor({
            pageName: config.common.api_default_query_page_name,
            perPageName: config.common.api_default_query_rows_name,
        }),
        new LoggingInterceptor(),
        new ResponseSerializerInterceptor(),
        app.get(LazyFieldInterceptor),
        new TransactionInterceptor(app.get(Reflector)),
        new ResponseValidationInterceptor(),
        app.get(ExpandInterceptor),
    )

    app.use(bodyParser.json({
        type: ['application/json-patch+json', 'application/json'],
        limit: bodyLimit(),
    }))

    app.getHttpAdapter().getInstance().disable('x-powered-by')

    // return formatted json
    app.getHttpAdapter().getInstance().set('json spaces', 2)
}
