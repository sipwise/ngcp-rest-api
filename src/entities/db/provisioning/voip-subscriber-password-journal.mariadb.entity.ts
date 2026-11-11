import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_subscriber_password_journal',
    database: 'provisioning',
})
export class VoipSubscriberPasswordJournal extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        subscriber_id!: number

    @Column({
        type: 'char',
        length: 56,
        nullable: false,
    })
        value!: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
    })
        created_at!: Date
}
