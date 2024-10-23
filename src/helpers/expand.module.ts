import {forwardRef, Module} from '@nestjs/common'
import {ExpandHelper} from '~/helpers/expand.helper'
import {CustomerContactModule} from '~/api/customercontacts/customer-contact.module'
import {ResellerModule} from '~/api/resellers/reseller.module'
import {ResellerController} from '~/api/resellers/reseller.controller'
import {ContractModule} from '~/api/contracts/contract.module'
import {ContractController} from '~/api/contracts/contract.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'
import {AdminModule} from '~/api/admins/admin.module'
import {ContactModule} from '~/api/contacts/contact.module'
import {ContactController} from '~/api/contacts/contact.controller'

@Module({
    imports: [
        // TODO: Check why we need to use forwardRef only for the AdminsModule
        forwardRef(() => AdminModule),
        ContactModule,
        ResellerModule,
        ContractModule,
        CustomerContactModule,
        JournalModule,
    ],
    providers: [
        ExpandHelper,
        {
            provide: 'BASE_CONTROLLERS_MAP',
            useFactory: (
                resellerController: ResellerController,
                contactController: ContactController,
                contractController: ContractController,
            ): any => {
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
