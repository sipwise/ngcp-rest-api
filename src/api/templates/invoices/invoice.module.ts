import {Module,forwardRef} from '@nestjs/common'

import {InvoiceTemplateController} from './invoice.controller'
import {InvoiceTemplateService} from './invoice.service'
import {InvoiceTemplateMariadbRepository} from './repositories/invoice.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
    ],
    providers: [InvoiceTemplateService, InvoiceTemplateMariadbRepository],
    controllers: [InvoiceTemplateController],
    exports: [InvoiceTemplateService],
})
export class InvoiceTemplateModule {
}
