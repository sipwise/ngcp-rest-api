import {genSalt, hash} from 'bcrypt'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'

export interface AdminInterface {
    billingData?: boolean
    callData?: boolean
    canResetPassword?: boolean
    email?: string
    id?: number
    isActive?: boolean
    isCcare?: boolean
    isMaster?: boolean
    isSuperuser?: boolean
    isSystem?: boolean
    lawfulIntercept?: boolean
    login?: string
    password?: string
    readOnly?: boolean
    resellerId?: number
    roleData?: internal.AclRole
    role?: string
    roleId?: number
    saltedpass?: string
    saltedpassModifyTimestamp?: Date
    showPasswords?: boolean
    enable2fa?: boolean
    otpSecret?: string
    otpInit?: boolean
}

export class Admin implements AdminInterface {
    billingData: boolean
    callData: boolean
    canResetPassword: boolean
    email?: string
    id: number
    isActive: boolean
    isCcare: boolean
    isMaster: boolean
    isSuperuser: boolean
    isSystem: boolean
    lawfulIntercept: boolean
    login: string
    password?: string
    readOnly: boolean
    resellerId?: number
    roleData?: internal.AclRole
    role: RbacRole
    roleId: number
    saltedpass: string
    saltedpassModifyTimestamp: Date
    showPasswords: boolean
    enable2fa: boolean
    otpInit: boolean
    otpSecret?: string

    static create(data: AdminInterface): Admin {
        const admin = new Admin()

        Object.keys(data).map(key => {
            admin[key] = data[key]
        })
        return admin
    }

    async setPermissionFlags(): Promise<void> {
        switch (this.role) {
            case RbacRole.system:
                this.isSystem = true
                this.isSuperuser = false
                this.isCcare = false
                this.lawfulIntercept = false
                break
            case RbacRole.admin:
                this.isSystem = false
                this.isSuperuser = true
                this.isCcare = false
                this.lawfulIntercept = false
                break
            case RbacRole.reseller:
                this.isSystem = false
                this.isSuperuser = false
                this.isCcare = false
                this.lawfulIntercept = false
                break
            case RbacRole.ccareadmin:
                this.isSystem = false
                this.isSuperuser = true
                this.isCcare = true
                this.lawfulIntercept = false
                break
            case RbacRole.ccare:
                this.isSystem = false
                this.isSuperuser = false
                this.isCcare = true
                this.lawfulIntercept = false
                break
            case RbacRole.lintercept:
                this.isSystem = false
                this.isSuperuser = false
                this.isCcare = false
                this.lawfulIntercept = true
                break
        }
    }

    async generateSaltedpass(bcrypt_cost: number = 13, salt?: string): Promise<string> {
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
