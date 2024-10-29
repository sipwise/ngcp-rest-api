import {Module,forwardRef} from '@nestjs/common'

import {AdminController} from './admin.controller'
import {AdminService} from './admin.service'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'
import {ExpandModule} from '~/helpers/expand.module'
import {AclRoleRepository} from '~/repositories/acl-role.repository'

@Module({
    imports: [
        forwardRef(() => ExpandModule),
        forwardRef(() => JournalModule),
    ],
    controllers: [AdminController],
    exports: [
        AdminService,
    ],
    providers: [
        AclRoleRepository,
        AdminMariadbRepository,
        AdminPasswordJournalMariadbRepository,
        AdminService,
        JournalService,
    ],
})
export class AdminModule {
}
