import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {NCOSSetLevel} from './ncos-set-level.mariadb.entity'

import {internal} from '~/entities'
import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

@Entity({
    name: 'ncos_levels',
    database: 'billing',
})
export class NCOSLevel extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        nullable: false,
    })
        level!: string

    @Column({
        type: 'enum',
        enum: NCOSLevelMode,
        nullable: false,
        default: NCOSLevelMode.Blacklist,
    })
        mode!: NCOSLevelMode

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        local_ac!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        intra_pbx!: boolean

    @Column({
        type: 'varchar',
        nullable: true,
        default: null,
    })
        description?: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        time_set_id?: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        expose_to_customer!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        time_set_invert!: boolean

    @OneToMany(() => NCOSSetLevel, ncosSetLevel => ncosSetLevel.ncos_level_id)
        setLevels!: NCOSSetLevel[]

    toInternal(): internal.NCOSLevel {
        const entity = new internal.NCOSLevel()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.level = this.level
        entity.mode = this.mode
        entity.localAc = this.local_ac
        entity.intraPbx = this.intra_pbx
        entity.description = this.description
        entity.timeSetId = this.time_set_id
        entity.exposeToCustomer = this.expose_to_customer
        entity.timeSetInvert = this.time_set_invert
        return entity
    }

    fromInternal(entity: internal.NCOSLevel): NCOSLevel {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.level = entity.level
        this.mode = entity.mode
        this.local_ac = entity.localAc
        this.intra_pbx = entity.intraPbx
        this.description = entity.description
        this.time_set_id = entity.timeSetId
        this.expose_to_customer = entity.exposeToCustomer
        this.time_set_invert = entity.timeSetInvert
        return this
    }
}
