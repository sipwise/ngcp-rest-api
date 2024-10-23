import {forwardRef, Module} from '@nestjs/common'
import {AdminController} from '~/api/admins/admin.controller'
import {AdminService} from '~/api/admins/admin.service'
import {AdminMariadbRepository} from '~/api/admins/repositories/admin.mariadb.repository'
import {ExpandModule} from '~/helpers/expand.module'
import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'
import {AclRoleRepository} from '~/repositories/acl-role.repository'
import {AdminPasswordJournalMariadbRepository} from '~/api/admins/repositories/admin-password-journal.mariadb.repository'

@Module({
    imports: [
        forwardRef(() => ExpandModule),
        JournalModule,
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
