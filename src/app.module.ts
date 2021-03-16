import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {DatabaseModule} from './core/database/database.module';
import {AdminsModule} from './modules/admins/admins.module';
import {ContactsModule} from './modules/contacts/contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true}),
    DatabaseModule,
    AdminsModule,
    ContactsModule,
  ],
})
export class AppModule {}
