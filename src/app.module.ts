import * as path from 'path'

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
import {ConfigModule} from '@nestjs/config'
import {ScheduleModule} from '@nestjs/schedule'
import {AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nModule, QueryResolver} from 'nestjs-i18n'

import {AdminModule} from './api/admins/admin.module'
import {PasswordChangeModule} from './api/auth/password/change/password-change.module'
import {PasswordModule} from './api/auth/password/password.module'
import {BanAdminModule} from './api/bans/admins/ban-admin.module'
import {BanModule} from './api/bans/ban.module'
import {BanSubscriberModule} from './api/bans/subscribers/ban-subscriber.module'
import {ClearCallCounterModule} from './api/clearcallcounters/clear-call-counter.module'
import {ContactModule} from './api/contacts/contact.module'
import {ContractModule} from './api/contracts/contract.module'
import {CustomerContactModule} from './api/customercontacts/customer-contact.module'
import {CustomerSpeedDialModule} from './api/customerspeeddials/customer-speed-dial.module'
import {DomainModule} from './api/domains/domain.module'
import {FileshareModule} from './api/fileshare/fileshare.module'
import {HeaderManipulationModule} from './api/header-manipulations/header-manipulation.module'
import {HeaderManipulationSetModule} from './api/header-manipulations/sets/header-manipulation-set.module'
import {HeaderManipulationRuleActionModule} from './api/header-manipulations/sets/rules/actions/header-manipulation-rule-action.module'
import {HeaderManipulationRuleConditionModule} from './api/header-manipulations/sets/rules/conditions/header-manipulation-rule-condition.module'
import {HeaderManipulationRuleModule} from './api/header-manipulations/sets/rules/header-manipulation-rule.module'
import {JournalModule} from './api/journals/journal.module'
import {NCOSModule} from './api/ncos/ncos.module'
import {NCOSSetModule} from './api/ncos-sets/ncos-set.module'
import {NumberModule} from './api/numbers/number.module'
import {PbxGroupMemberModule} from './api/pbx/groups/members/pbx-group-member.module'
import {PbxGroupModule} from './api/pbx/groups/pbx-group.module'
import {PbxModule} from './api/pbx/pbx.module'
import {ProductModule} from './api/products/product.module'
import {ResellerModule} from './api/resellers/reseller.module'
import {RewriteRuleModule as RewriteModule} from './api/rewrite-rules/rewrite-rule.module'
import {RewriteRuleSetModule} from './api/rewrite-rules/sets/rewrite-rule-set.module'
import {RewriteRuleModule} from './api/rewrite-rules/sets/rules/rewrite-rule.module'
import {SystemContactModule} from './api/systemcontacts/system-contact.module'
import {VoicemailModule} from './api/voicemails/voicemail.module'
import {AppController} from './app.controller'
import {AppService} from './app.service'
import {AuthModule} from './auth/auth.module'
import {AppConfig} from './config/schemas/app.config.schema'
import {DatabaseModule} from './database/database.module'
import {RedisModule} from './database/redis.module'
import {ExpandModule} from './helpers/expand.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {LicenseModule} from './license/license.module'
import {LicenseService} from './license/license.service'
import {LoggerService} from './logger/logger.service'
import {ContextMiddleware} from './middleware/context.middleware'
import {LoggerMiddleware} from './middleware/logger.middleware'
import {StateMiddleware} from './middleware/state.middleware'
import {DbStateSchedule} from './schedules/dbstate.schedule'
import {FileshareSchedule} from './schedules/fileshare.schedule'
import {RedisStateSchedule} from './schedules/redisstate.schedule'

import {PbxUserModule} from '~/api/pbx/users/pbx-user.module'

let modulesImport: Array<Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
    ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
            function (): AppConfig {
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
    BanAdminModule,
    BanSubscriberModule,
    BanModule,
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
    HeaderManipulationModule,
    HeaderManipulationRuleConditionModule,
    HeaderManipulationRuleActionModule,
    HeaderManipulationRuleModule,
    HeaderManipulationSetModule,
    NumberModule,
    PbxUserModule,
    PbxModule,
    PbxGroupMemberModule,
    PbxGroupModule,
    ProductModule,
    RedisModule,
    ResellerModule,
    RewriteModule,
    RewriteRuleModule,
    RewriteRuleSetModule,
    SystemContactModule,
    VoicemailModule,
    LicenseModule,
    PasswordModule,
    PasswordChangeModule,
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
        LicenseService,
    ],
    providers: [
        AppService,
        DbStateSchedule,
        FileshareSchedule,
        RedisStateSchedule,
        Logger,
        LoggerService,
        LicenseService,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(ContextMiddleware, LoggerMiddleware, StateMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }
}
