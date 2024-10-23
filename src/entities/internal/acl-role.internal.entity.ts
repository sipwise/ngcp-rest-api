import {Admin} from './admin.internal.entity'
import {RbacRole} from '../../config/constants.config'

export interface AclRoleInterface {
    id?: number,
    role?: string,
    is_acl?: boolean,
    has_access_to?: AclRole[]
    admins?: Admin[]
}

export class AclRole implements AclRoleInterface {

    id?: number

    role: string

    is_acl: boolean

    has_access_to: AclRole[]

    admins: Admin[]

    static create(data: AclRoleInterface): AclRole {
        const aclRole = new AclRole()
        Object.keys(data).map(key => {
            aclRole[key] = data[key]
        })
        return aclRole
    }

    // journals: Journal[]
    async hasPermission(roleId: number, isMaster: boolean): Promise<boolean> {
        for (const role of this.has_access_to) {
            if (role.id == roleId) {
                if(this.role == RbacRole.admin || this.role == RbacRole.reseller)
                    return isMaster
                return true
            }
        }
        return false
    }
}
