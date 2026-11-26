import {internal} from '~/entities'
import {deepCopy} from '~/helpers/deep-copy.helper'

export class AclRoleMockRepository {

    readByRoles(roles: string[]): Promise<internal.AclRole[]> {
        const system = internal.AclRole.create({id: 1, role: 'system', is_acl: false})
        const admin = internal.AclRole.create({id: 3, role: 'admin', is_acl: false})
        const reseller = internal.AclRole.create({id: 5, role: 'reseller', is_acl: false})
        const ccareadmin = internal.AclRole.create({id: 7, role: 'ccareadmin', is_acl: false})
        const ccare = internal.AclRole.create({id: 9, role: 'ccare', is_acl: false})
        const lintercept = internal.AclRole.create({id: 11, role: 'lintercept', is_acl: false})

        system.has_access_to = [system, admin, reseller, ccareadmin, ccare, lintercept]
        admin.has_access_to = [deepCopy<internal.AclRole>(admin), reseller, ccareadmin, ccare]
        reseller.has_access_to = [reseller, ccareadmin, ccare]
        ccareadmin.has_access_to = [ccareadmin, ccare]
        ccare.has_access_to = [ccare]

        const all = [system, admin, reseller, ccareadmin, ccare, lintercept]
        return Promise.resolve(all.filter(role => roles.includes(role.role)))
    }
}
