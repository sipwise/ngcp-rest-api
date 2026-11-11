import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_cf_mappings',
    database: 'provisioning',
})
export class VoipCfMapping extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        subscriber_id!: number

    @Column({
        type: 'enum',
        enum: ['cfu', 'cfb', 'cfna', 'cft', 'cfs', 'cfr', 'cfo'],
        nullable: false,
    })
        type!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        destination_set_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        time_set_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        source_set_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        bnumber_set_id?: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        enabled!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        use_redirection!: boolean
}
