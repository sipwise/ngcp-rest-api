import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {NCOSSetLevel} from './ncos-set-level.mariadb.entity'

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
        nullable: false,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        nullable: false,
    })
        level!: string

    @Column({
        type: 'enum',
        enum: ['whitelist', 'blacklist'],
        nullable: false,
        default: 'blacklist',
    })
        mode!: string

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

    @OneToMany(type => NCOSSetLevel, ncosSetLevel => ncosSetLevel.ncos_level_id)
        setLevels!: NCOSSetLevel[]
}
