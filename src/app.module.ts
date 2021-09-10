import {Global, MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common'
import {AdminsModule} from './api/admins/admins.module'
import {AppController} from './app.controller'
import {AppService} from './app.service'
import {AuthModule} from './auth/auth.module'
import {ConfigModule} from '@nestjs/config'
import {ContextMiddleware} from './middleware/context.middleware'
import {ContractsModule} from './api/contracts/contracts.module'
import {CustomercontactsModule} from './api/customercontacts/customercontacts.module'
import {DatabaseModule} from './database/database.module'
import {DomainsModule} from './api/domains/domains.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {JournalsModule} from './api/journals/journals.module'
import {ResellersModule} from './api/resellers/resellers.module'
import {SystemcontactsModule} from './api/systemcontacts/systemcontacts.module'
import {TimestampMiddleware} from './middleware/timestamp.middleware'
import {TxIDMiddleware} from './middleware/txid.middleware'

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
        AdminsModule,
        AuthModule,
        ContractsModule,
        CustomercontactsModule,
        DatabaseModule,
        DomainsModule,
        InterceptorModule,
        JournalsModule,
        ResellersModule,
        SystemcontactsModule,
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
