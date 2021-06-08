import {NestFactory} from '@nestjs/core'
import {AppModule} from './app.module'

import {readFileSync} from 'fs'
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import {ValidateInputPipe} from './pipes/validate.pipe'
import {AppClusterService} from './app-cluster.service'
import {TransformInterceptor} from './interceptors/transform.interceptor'
import {LoggerService} from './logger/logger.service'

async function bootstrap() {
    // TODO: evaluate and compare default Express vs Fastify
    //       https://docs.nestjs.com/techniques/performance#adapter
    const config = AppModule.config
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
            logger: ['error', 'warn'],
        },
    )
    app.useLogger(app.get(LoggerService))

    // Another way of getting the config data
    // const config: ConfigService = app.get('ConfigService');
    // config.get<number>('database.port');

    const doc_config = new DocumentBuilder()
        .setTitle('NGCP API')
        .setDescription('This is the NGCP API description')
        .setVersion('2.0')
        .addTag('NGCP')
        .build()

    const document = SwaggerModule.createDocument(app, doc_config)
    SwaggerModule.setup(config.common.api_prefix, app, document)

    app.setGlobalPrefix(config.common.api_prefix)
    app.useGlobalPipes(new ValidateInputPipe())

    app.useGlobalInterceptors(
        new TransformInterceptor({
            pageName: config.common.api_default_query_page_name,
            perPageName: config.common.api_default_query_rows_name,
        }),
    )

    await app.listen(config.common.api_port, '0.0.0.0')
}

AppClusterService.clusterize(bootstrap)
