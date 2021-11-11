import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Reseller} from './reseller.entity'
import {AclRole} from './acl-role.entity'

@Entity({
    name: 'journals',
    database: 'billing',
})
export class Journal extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'enum',
        enum: ['create', 'update', 'delete'],
    })
    operation!: string

    @Column({
        type: 'varchar',
        length: 64,
    })
    resource_name!: string

    @Column({
        type: 'int',
        width: 11,
    })
    resource_id!: number

    @Column({
        type: 'decimal',
        precision: 13,
        scale: 3,
    })
    timestamp!: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
    username?: string

    @Column({
        type: 'enum',
        enum: ['storable', 'json', 'json_deflate', 'sereal'],
    })
    content_format!: string

    @Column({
        nullable: true,
        type: 'blob',
        default: null,
    })
    content?: Uint8Array

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
    })
    role_id: number

    @ManyToOne(type => AclRole, role => role.journals)
    @JoinColumn({name: 'role_id'})
    role: AclRole

    @Column({
        nullable: true,
        type: 'varchar',
        length: 36,
    })
    tx_id: string

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
    })
    reseller_id: number

    @ManyToOne(type => Reseller, reseller => reseller.journals)
    @JoinColumn({name: 'reseller_id'})
    reseller?: Reseller

    @Column({
        nullable: true,
        type: 'int',
        width: 11
    })
    user_id: number
}
