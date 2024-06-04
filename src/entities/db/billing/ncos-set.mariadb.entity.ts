import {BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '../..'
import {NCOSSetLevel} from './ncos-set-level.mariadb.entity'

@Entity({
    name: 'ncos_sets',
    database: 'billing',
})
export class NCOSSet extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        nullable: true,
    })
        description?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        expose_to_customer!: boolean

    @OneToMany(type => NCOSSetLevel, ncosSetLevel => ncosSetLevel.ncos_set_id)
        setLevels!: NCOSSetLevel[]

    toInternal(): internal.NCOSSet {
        const entity = new internal.NCOSSet()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        entity.exposeToCustomer = this.expose_to_customer
        return entity
    }

    fromInternal(entity: internal.NCOSSet): NCOSSet {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.expose_to_customer = entity.exposeToCustomer
        return this
    }
}
