import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {DatabaseModule} from './core/database/database.module';
import {AdminsModule} from './modules/admins/admins.module';
import {ContactsModule} from './modules/contacts/contacts.module';
import {AuthModule} from './modules/auth/auth.module';
import {AppController} from "./app.controller";
import {JournalModule} from "./modules/journal/journal.module";

@Module({
    controllers: [
        AppController,
    ],
    imports: [
        ConfigModule.forRoot({isGlobal: true}),
        DatabaseModule,
        // LoggingModule,
        AdminsModule,
        ContactsModule,
        AuthModule,
        JournalModule,
    ],
})
export class AppModule {
}
