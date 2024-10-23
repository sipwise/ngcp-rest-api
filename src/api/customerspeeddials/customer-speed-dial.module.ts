import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {CustomerSpeedDialController} from '~/api/customerspeeddials/customer-speed-dial.controller'
import {CustomerSpeedDialService} from '~/api/customerspeeddials/customer-speed-dial.service'
import {ExpandModule} from '~/helpers/expand.module'
import {CustomerSpeedDialMariadbRepository} from '~/api/customerspeeddials/repositories/customer-speed-dial.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomerSpeedDialController],
    providers: [CustomerSpeedDialService, CustomerSpeedDialMariadbRepository],
})
export class CustomerSpeedDialModule {
}
