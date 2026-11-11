import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_cf_destinations',
    database: 'provisioning',
})
export class VoipCfDestination extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        destination_set_id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        destination!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        priority?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
        default: 300,
    })
        timeout!: number

    @Column({
        type: 'int',
        nullable: true,
    })
        announcement_id?: number
}
