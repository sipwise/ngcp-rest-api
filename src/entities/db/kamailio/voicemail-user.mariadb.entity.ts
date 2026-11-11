import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

/**
 * Voicemail box of a subscriber, customer_id is the subscriber's uuid
 */
@Entity({
    name: 'voicemail_users',
    database: 'kamailio',
})
export class VoicemailUser extends BaseEntity {
    @PrimaryGeneratedColumn()
        uniqueid!: number

    @Column({
        type: 'char',
        length: 36,
        nullable: false,
        default: '',
    })
        customer_id!: string

    @Column({
        type: 'varchar',
        length: 63,
        nullable: false,
        default: 'default',
    })
        context!: string

    @Column({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
        mailbox!: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: false,
        default: '0',
    })
        password!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
        default: '',
    })
        email!: string

    @Column({
        type: 'varchar',
        length: 10,
        nullable: false,
        default: 'central',
    })
        tz!: string
}
