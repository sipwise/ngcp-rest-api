import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { contactsProviders } from './contacts.provider';

@Module({
  controllers: [ContactsController],
  exports: [ContactsService],
  providers: [ContactsService, ...contactsProviders]
})
export class ContactsModule {}
