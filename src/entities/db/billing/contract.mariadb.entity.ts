import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {Contact} from './contact.mariadb.entity'
import {ContractBillingProfileNetwork} from './contract-billing-profile-network.mariadb.entity'
import {Product} from './product.mariadb.entity'
import {Reseller} from './reseller.mariadb.entity'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

import {internal} from '~/entities'
import {VoipContractSpeedDial} from '~/entities/db/provisioning'
import {ContractStatus, ContractType} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'

@Entity({
    name: 'contracts',
    database: 'billing',
})
export class Contract extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        customer_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        contact_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        order_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        profile_package_id?: number

    @Column({
        type: 'enum',
        enum: ContractStatus,
        nullable: false,
        default: [ContractStatus.Active],
    })
        status!: ContractStatus

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        external_id?: string

    @Column({
        type: 'date',
        nullable:false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        create_timestamp!: Date

    @Column({
        type: 'date',
        nullable: true,
    })
        activate_timestamp?: Date

    @Column({
        nullable: true,
        type: 'date',
    })
        terminate_timestamp?: Date

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        max_subscribers?: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        send_invoice!: boolean

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        subscriber_email_template_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        passreset_email_template_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        invoice_email_template_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        invoice_template_id?: number

    @Column({
        type: 'decimal',
        precision: 14,
        scale: 6,
        nullable: false,
        default: 0.000000,
    })
        vat_rate!: number

    @Column({
        type: 'boolean',
        unsigned: true,
        nullable: false,
    })
        add_vat!: boolean

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        product_id!: number

    @ManyToOne(() => Contact, contact => contact.id)
    @JoinColumn({name: 'contact_id'})
        contact!: Contact

    @OneToMany(() => VoipSubscriber, subscriber => subscriber.contract)
        voipSubscribers!: VoipSubscriber[]

    @OneToMany(() => Reseller, reseller => reseller.contract)
        resellers!: Reseller[]

    @ManyToOne(() => Product, product => product.contracts)
    @JoinColumn({name: 'product_id'})
        product!: Product

    @OneToMany(() => VoipContractSpeedDial, csd => csd.contract_id)
        voipContractSpeedDials!: VoipContractSpeedDial[]

    @OneToMany(() => ContractBillingProfileNetwork, billingProfileNetwork => billingProfileNetwork.contract, {eager: true})
        billingMappings!: ContractBillingProfileNetwork[]

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
    toInternalCustomer(): internal.Customer {
        const customer = internal.Customer.create({
            activateTimestamp: this.activate_timestamp,
            addVat: this.add_vat,
            contactId: this.contact_id,
            createTimestamp: this.create_timestamp,
            customerId: this.customer_id,
            externalId: this.external_id,
            id: this.id,
            invoiceEmailTemplateId: this.invoice_email_template_id,
            invoiceTemplateId: this.invoice_template_id,
            maxSubscribers: this.max_subscribers,
            modifyTimestamp: this.modify_timestamp,
            orderId: this.order_id,
            passresetEmailTemplateId: this.passreset_email_template_id,
            productId: this.product_id,
            profilePackageId: this.profile_package_id,
            sendInvoice: this.send_invoice,
            status: this.status,
            subscriberEmailTemplateId: this.subscriber_email_template_id,
            terminateTimestamp: this.terminate_timestamp,
            vatRate: this.vat_rate,
        })
        customer.type = this.product != undefined ? this.product.class as unknown as CustomerType : undefined
        return customer
    }

    fromInternalCustomer(customer: internal.Customer): Contract {
        this.activate_timestamp = customer.activateTimestamp
        this.add_vat = customer.addVat
        this.contact_id = customer.contactId
        this.create_timestamp = customer.createTimestamp
        this.customer_id = customer.customerId
        this.external_id = customer.externalId
        this.id = customer.id
        this.invoice_email_template_id = customer.invoiceEmailTemplateId
        this.invoice_template_id = customer.invoiceTemplateId
        this.max_subscribers = customer.maxSubscribers
        this.modify_timestamp = customer.modifyTimestamp
        this.order_id = customer.orderId
        this.passreset_email_template_id = customer.passresetEmailTemplateId
        this.product_id = customer.productId
        this.profile_package_id = customer.profilePackageId
        this.send_invoice = customer.sendInvoice
        this.status = customer.status
        this.subscriber_email_template_id = customer.subscriberEmailTemplateId
        this.terminate_timestamp = customer.terminateTimestamp
        this.vat_rate = customer.vatRate

        return this
    }
}
