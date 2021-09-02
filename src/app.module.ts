import {Global, MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common'
import {ConfigModule} from '@nestjs/config'
import {DatabaseModule} from './database/database.module'
import {AppController} from './app.controller'
import {AuthModule} from './auth/auth.module'
import {AdminsModule} from './api/admins/admins.module'
import {JournalsModule} from './api/journals/journals.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {TxIDMiddleware} from './middleware/txid.middleware'
import {TimestampMiddleware} from './middleware/timestamp.middleware'
import {ContextMiddleware} from './middleware/context.middleware'
import {DomainsModule} from './api/domains/domains.module'
import {AppService} from 'app.sevice'

@Global()
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
                    return AppService.config
                },
            ],
        }),
        DatabaseModule,
        AdminsModule,
        DomainsModule,
        AuthModule,
        JournalsModule,
        InterceptorModule,
    ],
    exports: [
        AppService,
    ],
    providers: [
        AppService,
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(ContextMiddleware, TxIDMiddleware, TimestampMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }
}
