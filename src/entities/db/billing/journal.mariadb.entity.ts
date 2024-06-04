import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Reseller} from './reseller.mariadb.entity'
import {AclRole} from './acl-role.mariadb.entity'
import {internal} from './../../../entities'

@Entity({
    name: 'journals',
    database: 'billing',
})
export class Journal extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'enum',
        enum: ['create', 'update', 'delete'],
        nullable: false,
        default: 'create',
    })
        operation!: string

    @Column({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
        resource_name!: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        resource_id!: number

    @Column({
        type: 'decimal',
        precision: 13,
        scale: 3,
        nullable: false,
    })
        timestamp!: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        username?: string

    @Column({
        type: 'enum',
        enum: ['storable', 'json', 'json_deflate', 'sereal'],
        nullable: false,
        default: 'json',
    })
        content_format!: string

    @Column({
        type: 'blob',
        nullable: true,
    })
        content?: Buffer | string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        role_id?: number

    @ManyToOne(type => AclRole, role => role.journals)
    @JoinColumn({name: 'role_id'})
        role: AclRole

    @Column({
        type: 'varchar',
        length: 36,
        nullable: true,
    })
        tx_id?: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @ManyToOne(type => Reseller, reseller => reseller.journals)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        user_id!: number

    fromInternal(journal: internal.Journal) {
        this.id = journal.id
        this.reseller_id = journal.reseller_id
        this.role_id = journal.role_id
        this.tx_id = journal.tx_id
        this.user_id = journal.user_id
        this.content = journal.content
        this.content_format = journal.content_format
        this.operation = journal.operation
        this.resource_id = journal.resource_id
        this.resource_name = journal.resource_name
        this.timestamp = journal.timestamp
        this.username = journal.username
    }

    toInternal(): internal.Journal {
        const journal = new internal.Journal()

        journal.id = this.id
        journal.reseller_id = this.reseller_id
        journal.role = this.role ? this.role.role : null
        journal.role_id = this.role_id
        journal.tx_id = this.tx_id
        journal.user_id = this.user_id
        journal.content = this.content
        journal.content_format = this.content_format
        journal.operation = this.operation
        journal.resource_id = this.resource_id
        journal.resource_name = this.resource_name
        journal.timestamp = this.timestamp
        journal.username = this.username

        return journal
    }
}
