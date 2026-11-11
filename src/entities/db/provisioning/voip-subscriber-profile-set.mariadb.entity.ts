import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_subscriber_profile_sets',
    database: 'provisioning',
})
export class VoipSubscriberProfileSet extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        reseller_id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        description!: string
}
