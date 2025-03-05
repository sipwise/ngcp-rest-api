import {NotFoundException} from '@nestjs/common'

import {internal} from '~/entities'
import {deepCopy} from '~/helpers/deep-copy.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class AclRoleMockRepository {

    async readOneByRole(role: string, _req: ServiceRequest): Promise<internal.AclRole> {
        const system = internal.AclRole.create({id: 1, role: 'system', is_acl: false})
        const admin = internal.AclRole.create({id: 3, role: 'admin', is_acl: false})
        const reseller = internal.AclRole.create({id: 5, role: 'reseller', is_acl: false})
        const ccareadmin = internal.AclRole.create({id: 7, role: 'ccareadmin', is_acl: false})
        const ccare = internal.AclRole.create({id: 9, role: 'ccare', is_acl: false})
        const lintercept = internal.AclRole.create({id: 11, role: 'lintercept', is_acl: false})

        switch (role) {
            case system.role:
                system.has_access_to = [system, admin, reseller, ccareadmin, ccare, lintercept]
                return system
            case admin.role:
                admin.has_access_to = [deepCopy<internal.AclRole>(admin), reseller, ccareadmin, ccare]
                return admin
            case reseller.role:
                reseller.has_access_to = [reseller, ccareadmin, ccare]
                return reseller
            case ccareadmin.role:
                ccareadmin.has_access_to = [ccareadmin, ccare]
                return ccareadmin
            case ccare.role:
                ccare.has_access_to = [ccare]
                return ccare
            case lintercept.role:
                return lintercept
        }
        throw new NotFoundException()
    }
}


