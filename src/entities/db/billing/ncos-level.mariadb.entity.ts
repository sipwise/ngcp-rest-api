import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {NCOSSetLevel} from './ncos-set-level.mariadb.entity'

@Entity({
    name: 'ncos_levels',
    database: 'billing',
})
export class NCOSLevel extends BaseEntity {

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
        level: string

    @Column({
        type: 'enum',
        enum: ['whitelist', 'blacklist'],
        default: 'blacklist',
    })
        mode: string

    @Column({
        type: 'boolean',
        default: 0,
    })
        local_ac: boolean

    @Column({
        type: 'boolean',
        default: 0,
    })
        intra_pbx: boolean

    @Column({
        nullable: true,
        type: 'varchar',
    })
        description: string

    @Column({
        nullable: false,
        type: 'int',
        width: 11,
    })
        time_set_id: number

    @Column({
        type: 'boolean',
    })
        expose_to_customer: boolean

    @OneToMany(type => NCOSSetLevel, ncosSetLevel => ncosSetLevel.ncos_level_id)
    setLevels?: NCOSSetLevel[]
}
