import {Contact} from './contact.mariadb.entity'
import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Product} from './product.mariadb.entity'

enum ContractStatus {
    Pending = 'pending',
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

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

    // @HasMany(() => ContractsBillingProfileNetwork, {
    //     sourceKey: 'id',
    // })
    // ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    // @HasMany(() => Voucher, {
    //     sourceKey: 'id',
    // })
    // Vouchers?: Voucher[]

    // @HasMany(() => Invoice, {
    //     sourceKey: 'id',
    // })
    // Invoices?: Invoice[]

    // @HasMany(() => VoipSubscriber, {
    //     sourceKey: 'id',
    // })
    // VoipSubscribers?: VoipSubscriber[]

    @OneToMany(type => Reseller, reseller => reseller.contract)
        resellers?: Reseller[]

    // @HasMany(() => ContractBalance, {
    //     sourceKey: 'id',
    // })
    // ContractBalances?: ContractBalance[]

    // @ManyToOne(type => Customer, customer => customer.contracts)
    // @JoinColumn({name: "customer_id"})
    // customer?: Customer

    // @BelongsTo(() => Order)
    // Order?: Order

    @ManyToOne(type => Product, product => product.contracts)
    @JoinColumn({name: 'product_id'})
        product?: Product

    // @BelongsTo(() => ProfilePackage)
    // ProfilePackage?: ProfilePackage

}
