import {BaseEntity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ViewColumn, ViewEntity} from 'typeorm'

import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

import {internal} from '~/entities'

@ViewEntity({
    database: 'billing',
    name: 'v_subscriber_contract_phonebook',
})
export class VSubscriberContractPhonebook extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: string

    @ViewColumn({
        name: 'subscriber_id',
    })
        subscriber_id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string

    @ViewColumn({
        name: 'number',
    })
        number!: string

    @ViewColumn({
        name: 'shared',
        transformer: {
            from: (value: number) => value === 1,
            to: (value: boolean) => value ? 1 : 0,
        },
    })
        shared!: boolean

    @ManyToOne(() => VoipSubscriber, contract => contract.phonebook)
    @JoinColumn({name: 'subscriber_id'})
        subscriber!: VoipSubscriber

    toInternal(): internal.VSubscriberPhonebook {
        const entity = new internal.VSubscriberPhonebook()
        entity.id = this.id
        entity.subscriberId = this.subscriber_id
        entity.name = this.name
        entity.number = this.number
        entity.shared = this.shared
        return entity
    }
}
