import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_subscriber_profile_attributes',
    database: 'provisioning',
})
export class VoipSubscriberProfileAttribute extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        profile_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        attribute_id!: number
}
