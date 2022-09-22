import {DynamicModule, ForwardReference, Global, Logger, MiddlewareConsumer, Module, NestModule, RequestMethod, Type} from '@nestjs/common'
import {ScheduleModule} from '@nestjs/schedule'
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
import {LoggerMiddleware} from './middleware/logger.middleware'
import {StateMiddleware} from './middleware/state.middleware'
import {DbStateSchedule} from './schedules/dbstate.schedule'
import {FileshareSchedule} from './schedules/fileshare.schedule'
import {FileshareModule} from './api/fileshare/fileshare.module'
import {ProductsModule} from './api/products/products.module'
import {VoicemailsModule} from './api/voicemails/voicemails.module'
import {ExpandModule} from './helpers/expand.module'
import {PbxgroupsModule} from './api/pbxgroups/pbxgroups.module'
import {ContactsModule} from './api/contacts/contacts.module'

let modulesImport: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
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
    ContactsModule,
    ContractsModule,
    CustomercontactsModule,
    DatabaseModule,
    DomainsModule,
    ExpandModule,
    FileshareModule,
    PbxgroupsModule,
    ProductsModule,
    ResellersModule,
    SystemcontactsModule,
    VoicemailsModule,
    ScheduleModule.forRoot(),
]
if (process.env.NODE_ENV != 'test') {
    modulesImport = [
        ...modulesImport,
        InterceptorModule,
        JournalsModule,
    ]
}

@Global()
@Module({
    controllers: [
        AppController,
    ],
    imports: [
        ...modulesImport,
    ],
    exports: [
        AppService,
        Logger,
    ],
    providers: [
        AppService,
        Logger,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(ContextMiddleware, LoggerMiddleware, StateMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }
}
