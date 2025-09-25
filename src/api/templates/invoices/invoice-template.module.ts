import {Module,forwardRef} from '@nestjs/common'

import {InvoiceTemplateController} from './invoice-template.controller'
import {InvoiceTemplateService} from './invoice-template.service'
import {InvoiceTemplateMariadbRepository} from './repositories/invoice-template.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    providers: [InvoiceTemplateService, InvoiceTemplateMariadbRepository],
    controllers: [InvoiceTemplateController],
    exports: [InvoiceTemplateService],
})
export class InvoiceTemplateModule {
}
