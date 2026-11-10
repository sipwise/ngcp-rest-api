import {Module, forwardRef} from '@nestjs/common'

import {InvoiceController} from './invoice.controller'
import {InvoiceService} from './invoice.service'
import {InvoiceMariadbRepository} from './repositories/invoice.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {InvoiceTemplateModule} from '~/api/templates/invoices/invoice.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
        InvoiceTemplateModule,
    ],
    providers: [InvoiceService, InvoiceMariadbRepository],
    controllers: [InvoiceController],
    exports: [InvoiceService],
})
export class InvoiceModule {
}
