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
        content?: Buffer | string

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
    })
        role_id?: number

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
        width: 11,
    })
        user_id: number

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
