import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {AclRole} from './acl-role.mariadb.entity'

@Entity({
    name: 'acl_role_mappings',
    database: 'billing',
})
export class AclRoleMapping extends BaseEntity {

    @PrimaryGeneratedColumn()
        accessor_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        has_access_to_id!: number

    @ManyToOne(() => AclRole)
    @JoinColumn({name: 'accessor_id'})
        id!: AclRole
}
