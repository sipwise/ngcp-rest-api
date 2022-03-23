import {BaseEntity, Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Journal} from './journal.entity'
import {Admin} from './admin.entity'
import {internal} from '../../../entities'

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
        has_access_to: AclRole[]

    @OneToMany(() => Admin, admin => admin.role)
        admins: Admin[]

    @OneToMany(() => Journal, journal => journal.role)
        journals: Journal[]

    fromInternal(role: internal.AclRole): AclRole {
        let admins: Admin[]
        let hasAccess: AclRole[]
        if (role == undefined)
            return
        if(role.admins != undefined)
            admins = role.admins.map((adm) => new Admin().fromInternal(adm))
        if(role.has_access_to != undefined)
            hasAccess = role.has_access_to.map((r) => new AclRole().fromInternal(r))

        this.role = role.role
        this.id = role.id
        this.is_acl = role.is_acl
        this.admins = admins
        this.has_access_to = hasAccess

        return this
    }

    async toInternal(): Promise<internal.AclRole> {
        const admins: internal.Admin[] = []

        if (this.admins != undefined) {
            for (const adm of this.admins) {
                admins.push(await adm.toInternal())
            }
        }

        const access_to: internal.AclRole[] = []
        if (this.has_access_to != undefined) {
            for (const r of this.has_access_to) {
                access_to.push(await r.toInternal())
            }
        }

        const role = new internal.AclRole()

        role.role = this.role
        role.id = this.id
        role.is_acl = this.is_acl
        role.admins = admins
        role.has_access_to = access_to

        return role
    }
}
