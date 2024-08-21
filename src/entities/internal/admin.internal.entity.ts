import {RbacRole} from '../../config/constants.config'
import {internal} from './../../entities'
import {genSalt, hash} from 'bcrypt'

export interface AdminInterface {
    billing_data?: boolean
    call_data?: boolean
    can_reset_password?: boolean
    email?: string
    id?: number
    is_active?: boolean
    is_ccare?: boolean
    is_master?: boolean
    is_superuser?: boolean
    is_system?: boolean
    lawful_intercept?: boolean
    login?: string
    password?: string
    read_only?: boolean
    reseller_id?: number
    role_data?: internal.AclRole
    role?: string
    role_id?: number
    saltedpass?: string
    show_passwords?: boolean
}

export class Admin implements AdminInterface {
    billing_data: boolean
    call_data: boolean
    can_reset_password: boolean
    email?: string
    id: number
    is_active: boolean
    is_ccare: boolean
    is_master: boolean
    is_superuser: boolean
    is_system: boolean
    lawful_intercept: boolean
    login: string
    password?: string
    read_only: boolean
    reseller_id?: number
    role_data?: internal.AclRole
    role: RbacRole
    role_id: number
    saltedpass: string
    show_passwords: boolean

    static create(data: AdminInterface): Admin {
        const admin = new Admin()

        Object.keys(data).map(key => {
            admin[key] = data[key]
        })
        return admin
    }

    async setPermissionFlags() {
        switch (this.role) {
        case RbacRole.system:
            this.is_system = true
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RbacRole.admin:
            this.is_system = false
            this.is_superuser = true
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RbacRole.reseller:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RbacRole.ccareadmin:
            this.is_system = false
            this.is_superuser = true
            this.is_ccare = true
            this.lawful_intercept = false
            break
        case RbacRole.ccare:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = true
            this.lawful_intercept = false
            break
        case RbacRole.lintercept:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = true
            break
        }
    }

    async generateSaltedpass(bcrypt_cost: number = 13, salt?: string) {
        const bcrypt_version = 'b'
        if (!salt) {
            salt = await genSalt(bcrypt_cost)
        } else {
            salt = `$2${bcrypt_version}$${bcrypt_cost.toString().padStart(2, '0')}$${salt}`
        }

        // Generate the hash using bcrypt with the custom salt
        const fullHash = await hash(this.password, salt)
        const rawSalt = fullHash.slice(7, 29)
        const b64hash = fullHash.slice(29)
        const saltedpass = `${rawSalt}$${b64hash}`
        return saltedpass
    }
}
