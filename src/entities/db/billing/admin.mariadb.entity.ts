import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {AclRole} from './acl-role.mariadb.entity'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'

@Entity({
    name: 'admins',
    database: 'billing',
})
export class Admin extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 31,
        nullable: false,
    })
        login!: string

    @Column({
        type: 'varchar',
        length: 32,
        nullable: true,
    })
        md5pass?: string

    @Column({
        type: 'varchar',
        length: 54,
        nullable: true,
    })
        saltedpass?: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
    })
        saltedpass_modify_timestamp: Date

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_master!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_superuser!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_ccare!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        is_active!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        read_only?: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        show_passwords!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        call_data!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        billing_data!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        lawful_intercept!: boolean

    @Column({
        type: 'bigint',
        unsigned: true,
        nullable: true,
    })
        ssl_client_m_serial?: number

    @Column({
        type: 'text',
        nullable: true,
    })
        ssl_client_certificate?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        email?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        can_reset_password!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_system!: boolean

    @Column({
        type: 'int',
        width: 11,
        nullable: false,
        unsigned: true,
        default: 0,
    })
        ban_increment_stage!: number

    @Column({
        type: 'timestamp',
        nullable: true,
    })
        last_banned_at?: Date

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        enable_2fa!: boolean

    @Column({
        type: 'varchar',
        length: 32,
        nullable: true,
        default: null,
    })
        otp_secret?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        show_otp_registration_info: boolean

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        last_banned_ip?: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        role_id!: number

    @ManyToOne(() => AclRole, role => role.admins)
    @JoinColumn({name: 'role_id'})
        role!: AclRole

    fromInternal(admin: internal.Admin): Admin {
        this.billing_data = admin.billingData
        this.call_data = admin.callData
        this.can_reset_password = admin.canResetPassword
        this.email = admin.email
        this.id = admin.id
        this.is_active = admin.isActive
        this.is_ccare = admin.isCcare
        this.is_master = admin.isMaster
        this.is_superuser = admin.isSuperuser
        this.is_system = admin.isSystem
        this.lawful_intercept = admin.lawfulIntercept
        this.login = admin.login
        this.read_only = admin.readOnly
        this.reseller_id = admin.resellerId
        this.enable_2fa = admin.enable2fa
        this.otp_secret = admin.otpSecret
        this.show_otp_registration_info = admin.otpInit
        if (admin.roleData != undefined)
            this.role = new AclRole().fromInternal(admin.roleData)
        this.role_id = admin.roleId
        this.show_passwords = admin.showPasswords
        this.saltedpass_modify_timestamp = admin.saltedpassModifyTimestamp
        if (admin.saltedpass != undefined)
            this.saltedpass = admin.saltedpass

        return this
    }

    toInternal(): internal.Admin {
        const admin = new internal.Admin()

        admin.billingData = this.billing_data
        admin.callData = this.call_data
        admin.canResetPassword = this.can_reset_password
        admin.email = this.email
        admin.id = this.id
        admin.isActive = this.is_active
        admin.isCcare = this.is_ccare
        admin.isMaster = this.is_master
        admin.isSuperuser = this.is_superuser
        admin.isSystem = this.is_system
        admin.lawfulIntercept = this.lawful_intercept
        admin.login = this.login
        admin.readOnly = this.read_only
        admin.resellerId = this.reseller_id
        admin.roleId = this.role_id
        admin.saltedpassModifyTimestamp = this.saltedpass_modify_timestamp
        admin.enable2fa = this.enable_2fa
        admin.otpInit = this.show_otp_registration_info
        admin.otpSecret = this.otp_secret
        if (this.role != undefined) {
            admin.role = RbacRole[this.role.role]
            admin.roleData = this.role.toInternal()
            admin.roleId = this.role.id
        }
        admin.showPasswords = this.show_passwords

        return admin
    }

    toBanAdminInternal(): internal.BanAdmin {
        const admin = new internal.BanAdmin()

        admin.id = this.id
        admin.resellerId = this.reseller_id
        admin.username = this.login
        admin.banIncrementStage = this.ban_increment_stage
        admin.lastBannedIp = this.last_banned_ip
        admin.lastBannedAt = this.last_banned_at

        return admin
    }
}
