import {Module,forwardRef} from '@nestjs/common'

import {AdminModule} from '~/api/admins/admin.module'
import {ContactController} from '~/api/contacts/contact.controller'
import {ContactModule} from '~/api/contacts/contact.module'
import {ContractController} from '~/api/contracts/contract.controller'
import {ContractModule} from '~/api/contracts/contract.module'
import {CustomerContactModule} from '~/api/customercontacts/customer-contact.module'
import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'
import {ResellerController} from '~/api/resellers/reseller.controller'
import {ResellerModule} from '~/api/resellers/reseller.module'
import {ExpandHelper} from '~/helpers/expand.helper'

@Module({
    imports: [
        // TODO: Check why we need to use forwardRef only for the AdminsModule
        forwardRef(() => AdminModule),
        forwardRef(() => JournalModule),
        forwardRef(() => ContactModule),
        forwardRef(() => ResellerModule),
        forwardRef(() => ContractModule),
        forwardRef(() => CustomerContactModule),
    ],
    providers: [
        ExpandHelper,
        {
            provide: 'BASE_CONTROLLERS_MAP',
            useFactory: (
                resellerController: ResellerController,
                contactController: ContactController,
                contractController: ContractController,
            ): unknown => {
                return {
                    resellerController: resellerController,
                    contactController: contactController,
                    contractController: contractController,
                }
            },
            inject: [ResellerController, ContactController, ContractController],
        },
        JournalService,
    ],
    exports: [ExpandHelper],
})
export class ExpandModule {

}
