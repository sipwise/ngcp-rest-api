import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {NCOSLevel} from './ncos-level.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'ncos_pattern_list',
    database: 'billing',
})
export class NCOSPattern extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        ncos_level_id: number

    @Column({
        type: 'varchar',
        nullable: false,
        length: 255,
    })
        pattern!: string

    @Column({
        type: 'text',
        nullable: true,
        default: null,
    })
        description?: string | null

    @ManyToOne(() => NCOSLevel, ncosLevel => ncosLevel.patterns)
    @JoinColumn({name: 'ncos_level_id'})
        level!: NCOSLevel

    toInternal(): internal.NCOSPattern {
        const entity = new internal.NCOSPattern()
        entity.id = this.id
        entity.ncosLevelId = this.ncos_level_id
        entity.pattern = this.pattern
        entity.description = this.description
        return entity
    }

    fromInternal(entity: internal.NCOSPattern): NCOSPattern {
        this.id = entity.id
        this.ncos_level_id = entity.ncosLevelId
        this.pattern = entity.pattern
        this.description = entity.description
        return this
    }
}
