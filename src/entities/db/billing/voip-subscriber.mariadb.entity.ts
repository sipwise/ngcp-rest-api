import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from 'typeorm'

import {Contract} from './contract.mariadb.entity'
import {SubscriberPhonebook} from './subscriber-phonebook.mariadb.entity'
import {VoipNumber} from './voip-number.mariadb.entity'

import {VoipSubscriber as ProvisioningVoipSubscriber} from '~/entities/db/provisioning/voip-subscriber.mariadb.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

@Entity({
    name: 'voip_subscribers',
    database: 'billing',
})
export class VoipSubscriber extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

    @Column({
        type: 'char',
        length: 36,
        nullable: false,
    })
        uuid!: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        username!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        domain_id!: number

    @Column({
        type: 'enum',
        enum: VoipSubscriberStatus,
        nullable: false,
        default: VoipSubscriberStatus.Active,
    })
        status!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        primary_number_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        external_id?: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        contact_id?: number

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

    @OneToOne(() => ProvisioningVoipSubscriber)
    @JoinColumn({name: 'uuid', referencedColumnName: 'uuid'})
        provisioningVoipSubscriber!: ProvisioningVoipSubscriber

    @OneToOne(() => VoipNumber, number => number.id)
    @JoinColumn({name: 'primary_number_id'})
        primaryNumber!: VoipNumber

    @OneToMany(() => VoipNumber, number => number.subscriber)
        voipNumbers!: VoipNumber[]

    @OneToMany(() => SubscriberPhonebook, phonebook => phonebook.subscriber)
        phonebook!: SubscriberPhonebook[]
}
