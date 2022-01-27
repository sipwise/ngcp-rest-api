import {AppClusterService} from './app-cluster.service'
import {AppModule} from './app.module'
import {AppService} from './app.service'
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import {NestFactory} from '@nestjs/core'
import {TransformInterceptor} from './interceptors/transform.interceptor'
import {ValidateInputPipe} from './pipes/validate.pipe'
import {readFileSync} from 'fs'
import {WinstonModule} from 'nest-winston'
import {winstonLoggerConfig} from './config/logger.config'
import bodyParser from 'body-parser'
import {LoggingInterceptor} from './interceptors/logging.interceptor'
import {HttpExceptionFilter} from './helpers/http-exception.filter'

async function bootstrap() {
    const config = AppService.config
    const app = await NestFactory.create(
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
        },
    )

    app.setGlobalPrefix(config.common.api_prefix)

    const doc_config = new DocumentBuilder()
        .setTitle('NGCP API')
        .setDescription('This is the NGCP API description')
        .setVersion('2.0')
        .addBasicAuth()
        .addBearerAuth()
        .addSecurity('cert', {
            type: 'http',
            scheme: 'cert',
        })
        .build()

    const document = SwaggerModule.createDocument(app, doc_config)
    SwaggerModule.setup(config.common.api_prefix, app, document)

    app.useGlobalPipes(new ValidateInputPipe())
    app.useGlobalFilters(new HttpExceptionFilter())

    app.useGlobalInterceptors(
        new TransformInterceptor({
            pageName: config.common.api_default_query_page_name,
            perPageName: config.common.api_default_query_rows_name,
        }),
        new LoggingInterceptor(),
    )

    app.use(bodyParser.json({
        type: ['application/json-patch+json', 'application/json'],
    }))

    await app.listen(config.common.api_port, process.env.NODE_ENV == 'development'
        ? '0.0.0.0'
        : '127.0.0.1',
    )
}

AppClusterService.clusterize(bootstrap)
