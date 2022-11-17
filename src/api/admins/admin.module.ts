import {forwardRef, Module} from '@nestjs/common'
import {AdminController} from './admin.controller'
import {AdminService} from './admin.service'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'
import {ExpandModule} from '../../helpers/expand.module'
import {JournalModule} from '../journals/journal.module'
import {JournalService} from '../journals/journal.service'
import {AclRoleRepository} from '../../repositories/acl-role.repository'

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
        AdminService,
        JournalService,
    ],
})
export class AdminModule {
}
