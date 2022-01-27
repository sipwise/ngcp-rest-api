import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {AclRole} from './acl-role.entity'

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
}
