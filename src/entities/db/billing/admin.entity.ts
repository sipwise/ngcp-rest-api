import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

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

    @Column({ length: 31 })
    login!: string

    @Column({ nullable: true })
    md5pass?: string

    @Column({ nullable: true })
    saltedpass?: string

    @Column({ default: 0 })
    is_master?: boolean

    @Column({ default: 0 })
    is_superuser?: boolean

    @Column({ default: 0 })
    is_ccare?: boolean

    @Column({ default: 1 })
    is_active?: boolean

    @Column({ default: 0 })
    read_only?: boolean

    @Column({ default: 1 })
    show_passwords?: boolean

    @Column({ default: 0 })
    call_data?: boolean

    @Column({ default: 1 })
    billing_data?: boolean

    @Column({ default: 0 })
    lawful_intercept?: boolean

    @Column({ nullable: true })
    ssl_client_m_serial?: number

    @Column({ nullable: true })
    ssl_client_certificate?: string

    @Column({ nullable: true })
    email?: string

    @Column({ default: 1 })
    can_reset_password?: boolean

    @Column()
    is_system!: boolean
}
