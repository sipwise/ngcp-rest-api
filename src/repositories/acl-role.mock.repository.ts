import {ServiceRequest} from '../interfaces/service-request.interface'
import {internal} from '../entities'
import {Logger} from 'typeorm'
import {NotFoundException} from '@nestjs/common'

export class AclRoleMockRepository {

    async readOneByRole(role: string, req: ServiceRequest): Promise<internal.AclRole> {
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

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export function deepCopy<T>(target: T): T {
    if (target === null) {
      return target
    }
    if (target instanceof Date) {
      return new Date(target.getTime()) as any
    }
    // First part is for array and second part is for Realm.Collection
    // if (target instanceof Array || typeof (target as any).type === 'string') {
    if (typeof target === 'object') {
      if (typeof target[(Symbol as any).iterator] === 'function') {
        const cp = [] as any[]
        if ((target as any as any[]).length > 0) {
          for (const arrayMember of target as any as any[]) {
            cp.push(deepCopy(arrayMember))
          }
        }
        return cp as any as T
      } else {
        const targetKeys = Object.keys(target)
        const cp = {}
        if (targetKeys.length > 0) {
          for (const key of targetKeys) {
            cp[key] = deepCopy(target[key])
          }
        }
        return cp as T
      }
    }
    // Means that object is atomic
    return target
  }
