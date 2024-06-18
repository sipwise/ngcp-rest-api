import {
    DynamicModule,
    ForwardReference,
    Global,
    Logger,
    MiddlewareConsumer,
    Module,
    NestModule,
    RequestMethod,
    Type,
} from '@nestjs/common'
import {ScheduleModule} from '@nestjs/schedule'
import {AdminModule} from './api/admins/admin.module'
import {AppController} from './app.controller'
import {AppService} from './app.service'
import {AuthModule} from './auth/auth.module'
import {ConfigModule} from '@nestjs/config'
import {ContextMiddleware} from './middleware/context.middleware'
import {ContractModule} from './api/contracts/contract.module'
import {CustomerContactModule} from './api/customercontacts/customer-contact.module'
import {DatabaseModule} from './database/database.module'
import {DomainModule} from './api/domains/domain.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {JournalModule} from './api/journals/journal.module'
import {ResellerModule} from './api/resellers/reseller.module'
import {SystemContactModule} from './api/systemcontacts/system-contact.module'
import {LoggerMiddleware} from './middleware/logger.middleware'
import {StateMiddleware} from './middleware/state.middleware'
import {FileshareModule} from './api/fileshare/fileshare.module'
import {ProductModule} from './api/products/product.module'
import {VoicemailModule} from './api/voicemails/voicemail.module'
import {ExpandModule} from './helpers/expand.module'
import {PbxModule} from './api/pbx/pbx.module'
import {PbxGroupMemberModule} from './api/pbx/groups/members/pbx-group-member.module'
import {PbxGroupModule} from './api/pbx/groups/pbx-group.module'
import {ContactModule} from './api/contacts/contact.module'
import {DbStateSchedule} from './schedules/dbstate.schedule'
import {RedisStateSchedule} from './schedules/redisstate.schedule'
import {FileshareSchedule} from './schedules/fileshare.schedule'
import {LoggerService} from './logger/logger.service'
import {ClearCallCounterModule} from './api/clearcallcounters/clear-call-counter.module'
import {CustomerSpeedDialModule} from './api/customerspeeddials/customer-speed-dial.module'
import {NumberModule} from './api/numbers/number.module'
import {NCOSModule} from './api/ncos/ncos.module'
import {NCOSSetModule} from './api/ncos-sets/ncos-set.module'
import {AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nModule, QueryResolver} from 'nestjs-i18n'
import {RedisModule} from './database/redis.module'

import * as path from 'path'

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
    I18nModule.forRoot({
        fallbackLanguage: 'en',
        loaderOptions: {
            path: path.join(__dirname, '/localisation/'),
            watch: true,
        },
        resolvers: [
            {use: QueryResolver, options: ['lang', 'locale', 'l']},
            new HeaderResolver(['x-custom-lang']),
            AcceptLanguageResolver,
            new CookieResolver(['lang', 'locale', 'l']),
        ],
    }),
    AdminModule,
    AuthModule,
    ClearCallCounterModule,
    ContactModule,
    ContractModule,
    CustomerContactModule,
    CustomerSpeedDialModule,
    DatabaseModule,
    DomainModule,
    ExpandModule,
    FileshareModule,
    NCOSModule,
    NCOSSetModule,
    NumberModule,
    PbxModule,
    PbxGroupMemberModule,
    PbxGroupModule,
    ProductModule,
    RedisModule,
    ResellerModule,
    SystemContactModule,
    VoicemailModule,
    ScheduleModule.forRoot(),
]
if (process.env.NODE_ENV != 'test') {
    modulesImport = [
        ...modulesImport,
        InterceptorModule,
        JournalModule,
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
        LoggerService,
    ],
    providers: [
        AppService,
        DbStateSchedule,
        FileshareSchedule,
        RedisStateSchedule,
        Logger,
        LoggerService,
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
