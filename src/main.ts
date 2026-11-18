import {readFileSync} from 'fs'

import {NestApplication, NestFactory} from '@nestjs/core'

import {AppClusterService} from './app-cluster.service'
import {AppModule} from './app.module'
import {AppService} from './app.service'
import {setupApp} from './app.setup'
import {createSwaggerDocument} from './helpers/swagger.helper'
import {LoggerService} from './logger/logger.service'

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
            logger: new LoggerService('main'),
            cors: true,
        },
    )

    const api_prefix = process.env.NODE_WP_BUNDLE
        ? config.common.api_prefix
        : 'api'

    app.setGlobalPrefix(api_prefix, {exclude: []})

    createSwaggerDocument(app, api_prefix)

    setupApp(app)

    await app.listen(config.common.api_port, process.env.NODE_ENV == 'development'
        ? '0.0.0.0'
        : '127.0.0.1',
    )
}

AppClusterService.clusterize(bootstrap)
