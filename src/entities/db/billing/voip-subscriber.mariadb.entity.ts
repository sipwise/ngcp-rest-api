import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from 'typeorm'

import {Contact} from './contact.mariadb.entity'
import {Contract} from './contract.mariadb.entity'
import {Domain} from './domain.mariadb.entity'
import {SubscriberPhonebook} from './subscriber-phonebook.mariadb.entity'
import {VoipNumber} from './voip-number.mariadb.entity'

import {internal} from '~/entities'
import {VoipSubscriber as ProvisioningVoipSubscriber} from '~/entities/db/provisioning/voip-subscriber.mariadb.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
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

    @ManyToOne(() => Domain)
    @JoinColumn({name: 'domain_id'})
        domain!: Domain

    @ManyToOne(() => Contact)
    @JoinColumn({name: 'contact_id'})
        contact?: Contact

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

    /**
     * Subscriber with the loaded provisioning row, contract (contact, product), domain, contact and primary number
     */
    toInternal(): internal.Subscriber {
        const subscriber = this.provisioningVoipSubscriber.toInternalSubscriber()
        subscriber.id = this.id
        subscriber.uuid = this.uuid
        subscriber.customerId = this.contract_id
        subscriber.customerProductClass = this.contract?.product?.class as ProductClass
        subscriber.resellerId = this.contract?.contact?.reseller_id
        subscriber.contactId = this.contact_id ?? null
        subscriber.username = this.username
        subscriber.domainId = this.domain_id
        subscriber.domain = this.domain?.domain
        subscriber.status = this.status as VoipSubscriberStatus
        subscriber.externalId = this.external_id ?? null
        subscriber.email = this.contact?.email ?? null
        subscriber.timezone = this.contact?.timezone ?? null
        subscriber.primaryNumber = this.primaryNumber
            ? {numberId: this.primaryNumber.id, cc: this.primaryNumber.cc, ac: this.primaryNumber.ac, sn: this.primaryNumber.sn}
            : null
        return subscriber
    }
}
