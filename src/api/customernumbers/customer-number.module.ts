import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {CustomerNumberController} from './customer-number.controller'
import {CustomerNumberService} from './customer-number.service'
import {CustomerNumberMariadbRepository} from './repositories/customer-number.mariadb.repository'

@Module({

    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomerNumberController],
    providers: [
        CustomerNumberController,
        CustomerNumberService,
        CustomerNumberMariadbRepository,
    ],
})
export class CustomerNumberModule {
}
