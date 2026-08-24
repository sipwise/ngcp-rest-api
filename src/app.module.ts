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
import {AuthJwtModule} from './api/auth/jwt/jwt.module'
import {AuthOtpModule} from './api/auth/otp/otp.module'
import {AuthPasswordChangeModule} from './api/auth/password/change/change.module'
import {AuthPasswordModule} from './api/auth/password/password.module'
import {AuthTokenModule} from './api/auth/tokens/token.module'
import {AuthUserinfoModule} from './api/auth/userinfo/userinfo.module'
import {BanAdminModule} from './api/bans/admins/admin.module'
import {BanModule} from './api/bans/ban.module'
import {BanIpModule} from './api/bans/ips/ip.module'
import {BanRegistrationModule} from './api/bans/registrations/registration.module'
import {BanSubscriberModule} from './api/bans/subscribers/subscriber.module'
import {ClearCallCounterModule} from './api/clearcallcounters/clear-call-counter.module'
import {ContactModule} from './api/contacts/contact.module'
import {ContractModule} from './api/contracts/contract.module'
import {CustomerContactModule} from './api/customercontacts/customer-contact.module'
import {CustomerBalanceModule} from './api/customers/balances/balance.module'
import {CustomerModule} from './api/customers/customer.module'
import {CustomerPhonebookModule} from './api/customers/phonebook/phonebook.module'
import {CustomerSpeedDialModule} from './api/customerspeeddials/customer-speed-dial.module'
import {DomainModule} from './api/domains/domain.module'
import {FileshareModule} from './api/fileshare/fileshare.module'
import {HeaderManipulationModule} from './api/header-manipulations/header-manipulation.module'
import {HeaderManipulationRuleActionModule} from './api/header-manipulations/sets/rules/actions/action.module'
import {HeaderManipulationRuleConditionModule} from './api/header-manipulations/sets/rules/conditions/condition.module'
import {HeaderManipulationRuleModule} from './api/header-manipulations/sets/rules/rule.module'
import {HeaderManipulationSetModule} from './api/header-manipulations/sets/set.module'
import {JournalModule} from './api/journals/journal.module'
import {NCOSLevelModule} from './api/ncos/levels/level.module'
import {NCOSModule} from './api/ncos/ncos.module'
import {NCOSPatternModule} from './api/ncos/patterns/pattern.module'
import {NCOSSetModule} from './api/ncos-sets/ncos-set.module'
import {NumberModule} from './api/numbers/number.module'
import {PbxGroupModule} from './api/pbx/groups/group.module'
import {PbxGroupMemberModule} from './api/pbx/groups/members/member.module'
import {PbxModule} from './api/pbx/pbx.module'
import {PbxUserModule} from './api/pbx/users/user.module'
import {PeeringGroupModule} from './api/peerings/groups/group.module'
import {PeeringInboundRuleModule} from './api/peerings/groups/inbound-rules/inbound-rule.module'
import {PeeringRuleModule} from './api/peerings/groups/rules/rule.module'
import {PeeringGroupServerModule} from './api/peerings/groups/servers/server.module'
import {PeeringModule} from './api/peerings/peering.module'
import {ProductModule} from './api/products/product.module'
import {ResellerPhonebookModule} from './api/resellers/phonebook/phonebook.module'
import {ResellerModule} from './api/resellers/reseller.module'
import {RewriteRuleModule as RewriteModule} from './api/rewrite-rules/rewrite-rule.module'
import {RewriteRuleModule} from './api/rewrite-rules/sets/rules/rule.module'
import {RewriteRuleSetModule} from './api/rewrite-rules/sets/set.module'
import {SubscriberPhonebookModule} from './api/subscribers/phonebook/phonebook.module'
import {SubscriberModule} from './api/subscribers/subscriber.module'
import {SystemContactModule} from './api/systemcontacts/system-contact.module'
import {InvoiceTemplateModule} from './api/templates/invoices/invoice.module'
import {TemplateModule} from './api/templates/template.module'
import {VoicemailModule} from './api/voicemails/voicemail.module'
import {AppService} from './app.service'
import {AuthModule} from './auth/auth.module'
import {AppConfig} from './config/schemas/app.config.schema'
import {DatabaseModule} from './database/database.module'
import {RedisModule} from './database/redis.module'
import {ExpandModule} from './helpers/expand.module'
import {TaskAgentModule} from './helpers/task-agent.module'
import {InterceptorModule} from './interceptors/interceptor.module'
import {LicenseModule} from './license/license.module'
import {LicenseService} from './license/license.service'
import {ContentTypeMiddleware} from './middleware/content-type.middleware'
import {ContextMiddleware} from './middleware/context.middleware'
import {LoggerMiddleware} from './middleware/logger.middleware'
import {StateMiddleware} from './middleware/state.middleware'
import {DbStateSchedule} from './schedules/dbstate.schedule'
import {FileshareSchedule} from './schedules/fileshare.schedule'
import {RedisStateSchedule} from './schedules/redisstate.schedule'

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
    AuthJwtModule,
    AuthTokenModule,
    AuthUserinfoModule,
    BanAdminModule,
    BanRegistrationModule,
    BanIpModule,
    BanSubscriberModule,
    BanModule,
    ClearCallCounterModule,
    ContactModule,
    ContractModule,
    CustomerBalanceModule,
    CustomerPhonebookModule,
    CustomerModule,
    CustomerContactModule,
    CustomerSpeedDialModule,
    DatabaseModule,
    DomainModule,
    ExpandModule,
    FileshareModule,
    NCOSLevelModule,
    NCOSPatternModule,
    NCOSModule,
    NCOSSetModule,
    HeaderManipulationModule,
    HeaderManipulationRuleConditionModule,
    HeaderManipulationRuleActionModule,
    HeaderManipulationRuleModule,
    HeaderManipulationSetModule,
    InvoiceTemplateModule,
    NumberModule,
    AuthOtpModule,
    PbxUserModule,
    PbxModule,
    PbxGroupMemberModule,
    PbxGroupModule,
    PeeringModule,
    PeeringGroupServerModule,
    PeeringInboundRuleModule,
    PeeringRuleModule,
    PeeringGroupModule,
    ProductModule,
    RedisModule,
    ResellerPhonebookModule,
    ResellerModule,
    RewriteModule,
    RewriteRuleModule,
    RewriteRuleSetModule,
    SubscriberPhonebookModule,
    SubscriberModule,
    SystemContactModule,
    TemplateModule,
    VoicemailModule,
    LicenseModule,
    AuthPasswordModule,
    AuthPasswordChangeModule,
    ScheduleModule.forRoot(),
    TaskAgentModule,
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
    imports: [
        ...modulesImport,
    ],
    exports: [
        AppService,
        Logger,
        LicenseService,
    ],
    providers: [
        AppService,
        DbStateSchedule,
        FileshareSchedule,
        RedisStateSchedule,
        Logger,
        LicenseService,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(ContentTypeMiddleware, ContextMiddleware, LoggerMiddleware, StateMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }
}
