import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_subscriber_profiles',
    database: 'provisioning',
})
export class VoipSubscriberProfile extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        set_id!: number

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

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        set_default!: boolean
}
