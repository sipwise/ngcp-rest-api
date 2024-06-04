import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '../..'
import {NCOSLevel} from './ncos-level.mariadb.entity'
import {NCOSSet} from './ncos-set.mariadb.entity'

@Entity({
    name: 'ncos_set_levels',
    database: 'billing',
})
export class NCOSSetLevel extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        ncos_set_id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        ncos_level_id!: number

    @ManyToOne(type => NCOSSet, ncosSet => ncosSet.id)
    @JoinColumn({name: 'ncos_set_id'})
        set!: NCOSSet

    @ManyToOne(type => NCOSLevel, ncosLevel => ncosLevel.id)
    @JoinColumn({name: 'ncos_level_id'})
        level!: NCOSLevel

    toInternal(): internal.NCOSSetLevel {
        const entity = new internal.NCOSSetLevel()
        entity.id = this.id
        entity.ncosSetId = this.ncos_set_id
        entity.ncosLevelId = this.ncos_level_id
        entity.level = this.level.level
        return entity
    }

    fromInternal(entity: internal.NCOSSetLevel): NCOSSetLevel {
        this.id = entity.id
        this.ncos_set_id = entity.ncosSetId
        this.ncos_level_id = entity.ncosLevelId
        return this
    }
}
