import {Module} from '@nestjs/common'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'
import {AdminsRepository} from './admins.repository'
import {ExpandModule} from '../../helpers/expand.module'
import {JournalsModule} from '../journals/journals.module'
import {JournalsService} from '../journals/journals.service'
import {RepositoriesModule} from '../../repositories/repositories.module'
import {AclRoleRepository} from '../../repositories/acl-role.repository'

@Module({
    imports: [
        ExpandModule,
        JournalsModule,
        RepositoriesModule,
    ],
    controllers: [AdminsController],
    exports: [
        AdminsService,
    ],
    providers: [
        AclRoleRepository,
        AdminsRepository,
        AdminsService,
        JournalsService,
    ],
})
export class AdminsModule {
}
