import {Module} from '@nestjs/common'
import {AclRoleRepository} from './acl-role.repository'
import {AdminsRepository} from '../api/admins/admins.repository'

@Module({
    imports: [
        AclRoleRepository,
        AdminsRepository,
    ],
    exports: [
        AclRoleRepository,
        AdminsRepository,
    ],
})
export class RepositoriesModule {

}