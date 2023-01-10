import {BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '../..'
import {NCOSSetLevel} from './ncos-set-level.mariadb.entity'

@Entity({
    name: 'ncos_sets',
    database: 'billing',
})
export class NCOSSet extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: false,
        type: 'int',
        width: 11,
    })
        reseller_id: number

    @Column({
        nullable: false,
        type: 'varchar',
    })
        name: string

    @Column({
        nullable: true,
        type: 'varchar',
    })
        description: string

    @OneToMany(type => NCOSSetLevel, ncosSetLevel => ncosSetLevel.ncos_set_id)
    setLevels?: NCOSSetLevel[]

    toInternal(): internal.NCOSSet {
        const entity = new internal.NCOSSet()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        return entity
    }

    fromInternal(entity: internal.NCOSSet): NCOSSet {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        return this
    }
}
