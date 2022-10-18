import {Contact} from './contact.mariadb.entity'
import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Product} from './product.mariadb.entity'
import {ContractStatus, ContractType} from '../../internal/contract.internal.entity'
import {internal} from '../../../entities'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

@Entity({
    name: 'contracts',
    database: 'billing',
})
export class Contract extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        customer_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        contact_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        order_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        profile_package_id?: number

    @Column({
        type: 'enum',
        enum: ContractStatus,
        default: [ContractStatus.Active],
    })
        status!: ContractStatus

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        external_id?: string

    @Column({
        type: 'date',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
    })
        create_timestamp!: Date

    @Column({
        nullable: true,
        type: 'date',
    })
        activate_timestamp?: Date

    @Column({
        nullable: true,
        type: 'date',
    })
        terminate_timestamp?: Date

    @Column({
        nullable: true,
        type: 'int',
    })
        max_subscribers?: number

    @Column({
        type: 'boolean',
    })
        send_invoice!: boolean

    @Column({
        nullable: true,
        type: 'int',
    })
        subscriber_email_template_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        passreset_email_template_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        invoice_email_template_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        invoice_template_id?: number

    @Column({
        type: 'boolean',
    })
        vat_rate!: boolean

    @Column({
        type: 'boolean',
    })
        add_vat!: boolean

    @Column({
        type: 'int',
    })
        product_id!: number

    @ManyToOne(type => Contact, contact => contact.id)
    @JoinColumn({name: 'contact_id'})
        contact?: Contact

    @OneToMany(type => VoipSubscriber, subscriber => subscriber.contract)
        voipSubscribers?: VoipSubscriber[]

    @OneToMany(type => Reseller, reseller => reseller.contract)
        resellers?: Reseller[]

    @ManyToOne(type => Product, product => product.contracts)
    @JoinColumn({name: 'product_id'})
        product?: Product

    toInternal(): internal.Contract {
        const contract = internal.Contract.create({
            activate_timestamp: this.activate_timestamp,
            add_vat: this.add_vat,
            contact_id: this.contact_id,
            create_timestamp: this.create_timestamp,
            customer_id: this.customer_id,
            external_id: this.external_id,
            id: this.id,
            invoice_email_template_id: this.invoice_email_template_id,
            invoice_template_id: this.invoice_template_id,
            max_subscribers: this.max_subscribers,
            modify_timestamp: this.modify_timestamp,
            order_id: this.order_id,
            passreset_email_template_id: this.passreset_email_template_id,
            product_id: this.product_id,
            profile_package_id: this.profile_package_id,
            send_invoice: this.send_invoice,
            status: this.status,
            subscriber_email_template_id: this.subscriber_email_template_id,
            terminate_timestamp: this.terminate_timestamp,
            vat_rate: this.vat_rate,
        })
        contract.type = this.product != undefined ? this.product.class as unknown as ContractType : undefined
        return contract
    }

    toInternalCustomerNumber(): internal.CustomerNumber {
        const subscriberNumbers: internal.SubscriberNumber[] = []
        this.voipSubscribers.map(sub => {
            sub.voipNumbers.map(num => {
                subscriberNumbers.push({
                    id: sub.id,
                    numberID: num.id,
                    ac: num.ac,
                    cc: num.cc,
                    sn: num.sn,
                    isDevID: sub.provisioningVoipSubscriber.dbAliases[0].is_devid,
                    isPrimary: sub.provisioningVoipSubscriber.dbAliases[0].is_primary,
                })
            })
        })
        return internal.CustomerNumber.create({id: this.id, numbers: subscriberNumbers})
    }

    fromInternal(contract: internal.Contract): Contract {
        this.activate_timestamp = contract.activate_timestamp
        this.add_vat = contract.add_vat
        this.contact_id = contract.contact_id
        this.create_timestamp = contract.create_timestamp
        this.customer_id = contract.customer_id
        this.external_id = contract.external_id
        this.id = contract.id
        this.invoice_email_template_id = contract.invoice_email_template_id
        this.invoice_template_id = contract.invoice_template_id
        this.max_subscribers = contract.max_subscribers
        this.modify_timestamp = contract.modify_timestamp
        this.order_id = contract.order_id
        this.passreset_email_template_id = contract.passreset_email_template_id
        this.product_id = contract.product_id
        this.profile_package_id = contract.profile_package_id
        this.send_invoice = contract.send_invoice
        this.status = contract.status
        this.subscriber_email_template_id = contract.subscriber_email_template_id
        this.terminate_timestamp = contract.terminate_timestamp
        this.vat_rate = contract.vat_rate

        return this
    }
}
