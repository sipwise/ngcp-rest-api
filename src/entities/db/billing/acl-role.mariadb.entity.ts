import {BaseEntity, Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {Admin} from './admin.mariadb.entity'
import {Journal} from './journal.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'acl_roles',
    database: 'billing',
})
export class AclRole extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
        role!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_acl!: boolean

    @ManyToMany(() => AclRole)
    @JoinTable({
        name: 'acl_role_mappings',
        joinColumn: {name: 'accessor_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'has_access_to_id', referencedColumnName: 'id'},
    })
        has_access_to!: AclRole[]

    @OneToMany(() => Admin, admin => admin.role)
        admins!: Admin[]

    @OneToMany(() => Journal, journal => journal.role)
        journals!: Journal[]

    fromInternal(role: internal.AclRole): AclRole {
        let admins: Admin[]
        let hasAccess: AclRole[]
        if (role == undefined)
            return
        if (role.has_access_to != undefined)
            hasAccess = role.has_access_to.map((r) => new AclRole().fromInternal(r))

        this.role = role.role
        this.id = role.id
        this.is_acl = role.is_acl
        this.admins = admins
        this.has_access_to = hasAccess

        return this
    }

    toInternal(): internal.AclRole {
        const role = Object.assign(new internal.AclRole(), {
            ...this,
            has_access_to: AclRole.assignRoleAccessTo(this),
        })

        return role
    }

    private static assignRoleAccessTo(role: AclRole): internal.AclRole[] | undefined {
        if (!role.has_access_to) return undefined

        return role.has_access_to.map((r) =>
            Object.assign(new internal.AclRole(), {
                ...r,
                has_access_to: undefined,
            }),
        )
    }
}
