import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common'
import {ConfigModule} from '@nestjs/config'
import {DatabaseModule} from './database/database.module'
import {AppController} from './app.controller'
import {AuthModule} from './auth/auth.module'
import {AdminsModule} from './api/admins/admins.module'
import {ContactsModule} from './api/contacts/contacts.module'
import {JournalsModule} from './api/journals/journals.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {TxIDMiddleware} from './middleware/txid.middleware'
import {TimestampMiddleware} from './middleware/timestamp.middleware'
import {ContextMiddleware} from './middleware/context.middleware'
import {config} from './config/main.config'
import {DomainsModule} from './api/domains/domains.module'

@Module({
    controllers: [
        AppController,
    ],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [
                function () {
                    return config
                },
            ],
        }),
        DatabaseModule,
        AdminsModule,
        ContactsModule,
        DomainsModule,
        AuthModule,
        JournalsModule,
        InterceptorModule,
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(ContextMiddleware, TxIDMiddleware, TimestampMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }

    // static method to fetch config files when the app is not initialised yet
    static config = config
}
