import {Module} from '@nestjs/common'
import {AclRoleRepository} from './acl-role.repository'

@Module({
    imports: [
        AclRoleRepository,
    ],
    exports: [
        AclRoleRepository,
    ],
})
export class RepositoriesModule {

}