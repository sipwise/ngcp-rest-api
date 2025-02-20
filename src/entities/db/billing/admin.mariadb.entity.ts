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
        this.billing_data = admin.billing_data
        this.call_data = admin.call_data
        this.can_reset_password = admin.can_reset_password
        this.email = admin.email
        this.id = admin.id
        this.is_active = admin.is_active
        this.is_ccare = admin.is_ccare
        this.is_master = admin.is_master
        this.is_superuser = admin.is_superuser
        this.is_system = admin.is_system
        this.lawful_intercept = admin.lawful_intercept
        this.login = admin.login
        this.read_only = admin.read_only
        this.reseller_id = admin.reseller_id
        if (admin.role_data != undefined)
            this.role = new AclRole().fromInternal(admin.role_data)
        this.role_id = admin.role_id
        this.show_passwords = admin.show_passwords
        this.saltedpass_modify_timestamp = admin.saltedpass_modify_timestamp
        if (admin.saltedpass != undefined)
            this.saltedpass = admin.saltedpass

        return this
    }

    toInternal(): internal.Admin {
        const admin = new internal.Admin()

        admin.billing_data = this.billing_data
        admin.call_data = this.call_data
        admin.can_reset_password = this.can_reset_password
        admin.email = this.email
        admin.id = this.id
        admin.is_active = this.is_active
        admin.is_ccare = this.is_ccare
        admin.is_master = this.is_master
        admin.is_superuser = this.is_superuser
        admin.is_system = this.is_system
        admin.lawful_intercept = this.lawful_intercept
        admin.login = this.login
        admin.read_only = this.read_only
        admin.reseller_id = this.reseller_id
        admin.role_id = this.role_id
        admin.saltedpass_modify_timestamp = this.saltedpass_modify_timestamp
        if (this.role != undefined) {
            admin.role = RbacRole[this.role.role]
            admin.role_data = this.role.toInternal()
            admin.role_id = this.role.id
        }
        admin.show_passwords = this.show_passwords

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
