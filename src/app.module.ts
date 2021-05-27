import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {DatabaseModule} from './core/database/database.module';
import {AdminsModule} from './modules/admins/admins.module';
import {ContactsModule} from './modules/contacts/contacts.module';
import {AuthModule} from './modules/auth/auth.module';
import {AppController} from "./app.controller";
import {JournalModule} from "./modules/journal/journal.module";
import {TxIDMiddleware} from "./core/middleware/txid.middleware";
import {TimestampMiddleware} from "./core/middleware/timestamp.middleware";
import {ContextMiddleware} from "./core/middleware/context.middleware";
import {InterceptorModule} from "./core/interceptors/interceptor.module";
import {config} from './config/main';

@Module({
    controllers: [
        AppController,
    ],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [function() { return config }]
        }),
        DatabaseModule,
        // LoggingModule,
        AdminsModule,
        ContactsModule,
        AuthModule,
        JournalModule,
        InterceptorModule
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(ContextMiddleware, TxIDMiddleware, TimestampMiddleware).forRoutes({path: '*', method: RequestMethod.ALL})
    }
    // static method to fetch config files when the app is not initialised yet
    static config = config;
}
