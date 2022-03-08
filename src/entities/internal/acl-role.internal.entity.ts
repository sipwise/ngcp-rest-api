import {Admin} from './admin.internal.entity'


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

    // journals: Journal[]
    async hasPermission(roleId: number): Promise<boolean> {
        for (const role of this.has_access_to) {
            if (role.id == roleId) {
                return true
            }
        }
        return false
    }

    static create(data: AclRoleInterface): AclRole {
        const aclRole = new AclRole()
        Object.keys(data).map(key => {
            aclRole[key] = data[key]
        })
        return aclRole
    }
}
