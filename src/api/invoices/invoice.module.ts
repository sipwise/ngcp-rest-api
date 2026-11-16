import {Module, forwardRef} from '@nestjs/common'

import {InvoiceController} from './invoice.controller'
import {InvoiceService} from './invoice.service'
import {InvoiceMariadbRepository} from './repositories/invoice.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {InvoiceTemplateModule} from '~/api/templates/invoices/invoice.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        InvoiceTemplateModule,
    ],
    providers: [InvoiceService, InvoiceMariadbRepository],
    controllers: [InvoiceController],
    exports: [InvoiceService],
})
export class InvoiceModule {
}
