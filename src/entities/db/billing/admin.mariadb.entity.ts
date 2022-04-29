import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {AclRole} from './acl-role.mariadb.entity'
import {RbacRole} from '../../../config/constants.config'
import {internal} from '../../../entities'

@Entity({
    name: 'admins',
    database: 'billing',
})
export class Admin extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        unsigned: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 31,
    })
        login!: string

    @Column({
        type: 'varchar',
        nullable: true,
        length: 32,
    })
        md5pass?: string

    @Column({
        type: 'varchar',
        length: 54,
        nullable: true,
    })
        saltedpass?: string

    @Column({
        type: 'boolean',
        default: false,
    })
        is_master?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        is_superuser?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        is_ccare?: boolean

    @Column({
        type: 'boolean',
        default: 1,
    })
        is_active?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        read_only?: boolean

    @Column({
        type: 'boolean',
        default: 1,
    })
        show_passwords?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        call_data?: boolean

    @Column({
        type: 'boolean',
        default: 1,
    })
        billing_data?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        lawful_intercept?: boolean

    @Column({
        type: 'bigint',
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
        default: 1,
    })
        can_reset_password?: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        is_system!: boolean

    @Column({
        type: 'int',
        width: 11,
    })
        role_id: number

    @ManyToOne(() => AclRole, role => role.admins)
    @JoinColumn({name: 'role_id'})
        role: AclRole

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
        if (admin.saltedpass != undefined)
            this.saltedpass = admin.saltedpass

        return this
    }

    async toInternal(): Promise<internal.Admin> {
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
        if (this.role != undefined) {
            admin.role = RbacRole[this.role.role]
            admin.role_data = await this.role.toInternal()
            admin.role_id = this.role.id
        }
        admin.show_passwords = this.show_passwords

        return admin
    }
}
