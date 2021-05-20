import {Module} from '@nestjs/common';
import {ContactsService} from './contacts.service';
import {ContactsController} from './contacts.controller';
import {contactsProviders} from './contacts.provider';
import {AdminsService} from '../admins/admins.service';
import {adminsProviders} from '../admins/admins.providers';
import {InterceptorModule} from "../../core/interceptors/interceptor.module";

@Module({
    imports: [InterceptorModule],
    controllers: [ContactsController],
    exports: [ContactsService],
    providers: [ContactsService, ...contactsProviders, AdminsService, ...adminsProviders]
})
export class ContactsModule {
}
