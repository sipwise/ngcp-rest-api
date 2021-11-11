import {BaseEntity, Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Journal} from './journal.entity'
import {Admin} from './admin.entity'

@Entity({
    name: 'acl_roles',
    database: 'billing',
})
export class AclRole extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'varchar',
        length: 64,
    })
    role: string

    @Column({
        type: 'boolean',
    })
    is_acl: boolean

    @ManyToMany(() => AclRole)
    @JoinTable({
        name: 'acl_role_mappings',
        joinColumn: {name: 'accessor_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'has_access_to_id', referencedColumnName: 'id'},
    })
    has_access_to: Promise<AclRole[]>

    @OneToMany(() => Admin, admin => admin.role)
    admins: Admin[]

    @OneToMany(() => Journal, journal => journal.role)
    journals: Journal[]
}
