import {readFileSync} from 'fs'

import {NestApplication, NestFactory} from '@nestjs/core'
import bodyParser from 'body-parser'
import {WinstonModule} from 'nest-winston'

import {AppClusterService} from './app-cluster.service'
import {AppModule} from './app.module'
import {AppService} from './app.service'
import {winstonLoggerConfig} from './config/logger.config'
import {HttpExceptionFilter} from './helpers/http-exception.filter'
import {createSwaggerDocument} from './helpers/swagger.helper'
import {LoggingInterceptor} from './interceptors/logging.interceptor'
import {TransformInterceptor} from './interceptors/transform.interceptor'
import {ResponseValidationInterceptor} from './interceptors/validate.interceptor'
import {ValidateInputPipe} from './pipes/validate.pipe'

async function bootstrap(): Promise<void> {
    const config = AppService.config
    const app = await NestFactory.create<NestApplication>(
        AppModule,
        {
            httpsOptions: {
                key: readFileSync(config.ssl.ssl_cert_key_file),
                cert: readFileSync(config.ssl.ssl_cert_file),
                ca: readFileSync(config.ssl.ssl_cert_file),
                requestCert: true,
                rejectUnauthorized: false,
            },
            logger: WinstonModule.createLogger(winstonLoggerConfig),
            cors: true,
        },
    )

    const api_prefix = process.env.NODE_WP_BUNDLE
        ? config.common.api_prefix
        : 'api'

    app.setGlobalPrefix(api_prefix, {exclude: []})

    createSwaggerDocument(app, api_prefix)

    app.useGlobalPipes(
        new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: false,
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
        new ResponseValidationInterceptor(),
    )

    app.use(bodyParser.json({
        type: ['application/json-patch+json', 'application/json'],
    }))

    // disable x-powered-by header
    app.getHttpAdapter().getInstance().disable('x-powered-by')

    await app.listen(config.common.api_port, process.env.NODE_ENV == 'development'
        ? '0.0.0.0'
        : '127.0.0.1',
    )
}

AppClusterService.clusterize(bootstrap)
