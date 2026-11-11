import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_cf_destination_sets',
    database: 'provisioning',
})
export class VoipCfDestinationSet extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        subscriber_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string
}
