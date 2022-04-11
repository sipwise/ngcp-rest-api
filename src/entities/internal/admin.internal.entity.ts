import {RBAC_ROLES} from '../../config/constants.config'
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
    role: RBAC_ROLES
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
        case RBAC_ROLES.system:
            this.is_system = true
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RBAC_ROLES.admin:
            this.is_system = false
            this.is_superuser = true
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RBAC_ROLES.reseller:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = false
            break
        case RBAC_ROLES.ccareadmin:
            this.is_system = false
            this.is_superuser = true
            this.is_ccare = true
            this.lawful_intercept = false
            break
        case RBAC_ROLES.ccare:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = true
            this.lawful_intercept = false
            break
        case RBAC_ROLES.lintercept:
            this.is_system = false
            this.is_superuser = false
            this.is_ccare = false
            this.lawful_intercept = true
            break
        }
    }

    /**
     * Generates salted hash from plain text password.
     */
    async generateSaltedpass() {
        const bcrypt_version = 'b'
        const bcrypt_cost = 13
        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(this.password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        this.saltedpass = b64salt + '$' + b64hash
    }
}
