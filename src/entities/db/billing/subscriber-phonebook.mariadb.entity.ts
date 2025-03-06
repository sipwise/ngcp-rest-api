import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'subscriber_phonebook',
    database: 'billing',
})
export class SubscriberPhonebook extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        subscriber_id!: number

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
        number!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        shared!: boolean

    @ManyToOne(() => VoipSubscriber, contract => contract.phonebook)
    @JoinColumn({name: 'subscriber_id'})
        subscriber!: VoipSubscriber

    toInternal(): internal.SubscriberPhonebook {
        const entity = new internal.SubscriberPhonebook()
        entity.id = this.id
        entity.subscriberId = this.subscriber_id
        entity.name = this.name
        entity.number = this.number
        entity.shared = this.shared
        return entity
    }

    fromInternal(phonebook: internal.SubscriberPhonebook): SubscriberPhonebook {
        this.id = phonebook.id as number
        this.subscriber_id = phonebook.subscriberId
        this.name = phonebook.name
        this.number = phonebook.number
        this.shared = phonebook.shared
        return this
    }
}
