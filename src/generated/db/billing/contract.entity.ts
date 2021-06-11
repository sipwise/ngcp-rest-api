import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {ContractBalance} from './contract-balance.entity'
import {Invoice} from './invoice.entity'
import {VoipSubscriber} from './voip-subscriber.entity'
import {Voucher} from './voucher.entity'
import {Reseller} from './reseller.entity'
import {ContractsBillingProfileNetwork} from './contracts-billing-profile-network.entity'
import {Customer} from './customer.entity'
import {Order} from './order.entity'
import {Product} from './product.entity'
import {ProfilePackage} from './profile-package.entity'

interface ContractAttributes {
    id?: number;
    customerId?: number;
    contactId?: number;
    orderId?: number;
    profilePackageId?: number;
    status: string;
    externalId?: string;
    modifyTimestamp: Date;
    createTimestamp: Date;
    activateTimestamp?: Date;
    terminateTimestamp?: Date;
    maxSubscribers?: number;
    sendInvoice: number;
    subscriberEmailTemplateId?: number;
    passresetEmailTemplateId?: number;
    invoiceEmailTemplateId?: number;
    invoiceTemplateId?: number;
    vatRate: number;
    addVat: number;
    productId: number;
}

@Table({
    tableName: 'contracts',
    timestamps: false,
})
export class Contract extends Model<ContractAttributes, ContractAttributes> implements ContractAttributes {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'PRIMARY',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    id?: number

    @ForeignKey(() => Customer)
    @Column({
        field: 'customer_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customerId?: number

    @ForeignKey(() => Contact)
    @Column({
        field: 'contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contactId?: number

    @ForeignKey(() => Order)
    @Column({
        field: 'order_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'orderid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    orderId?: number

    @ForeignKey(() => ProfilePackage)
    @Column({
        field: 'profile_package_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'c_package_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profilePackageId?: number

    @Column({
        type: DataType.ENUM('pending', 'active', 'locked', 'terminated'),
    })
    status!: string

    @Column({
        field: 'external_id',
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    externalId?: string

    @Column({
        field: 'modify_timestamp',
        type: DataType.DATE,
    })
    modifyTimestamp!: Date

    @Column({
        field: 'create_timestamp',
        type: DataType.DATE,
    })
    createTimestamp!: Date

    @Column({
        field: 'activate_timestamp',
        allowNull: true,
        type: DataType.DATE,
    })
    activateTimestamp?: Date

    @Column({
        field: 'terminate_timestamp',
        allowNull: true,
        type: DataType.DATE,
    })
    terminateTimestamp?: Date

    @Column({
        field: 'max_subscribers',
        allowNull: true,
        type: DataType.INTEGER,
    })
    maxSubscribers?: number

    @Column({
        field: 'send_invoice',
        type: DataType.TINYINT,
    })
    sendInvoice!: number

    @Column({
        field: 'subscriber_email_template_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    subscriberEmailTemplateId?: number

    @Column({
        field: 'passreset_email_template_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    passresetEmailTemplateId?: number

    @Column({
        field: 'invoice_email_template_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    invoiceEmailTemplateId?: number

    @Column({
        field: 'invoice_template_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    invoiceTemplateId?: number

    @Column({
        field: 'vat_rate',
        type: DataType.TINYINT,
    })
    vatRate!: number

    @Column({
        field: 'add_vat',
        type: DataType.TINYINT,
    })
    addVat!: number

    @ForeignKey(() => Product)
    @Column({
        field: 'product_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'c_productid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    productId!: number

    @BelongsTo(() => Contact)
    Contact?: Contact

    @HasMany(() => ContractBalance, {
        sourceKey: 'id',
    })
    ContractBalances?: ContractBalance[]

    @HasMany(() => Invoice, {
        sourceKey: 'id',
    })
    Invoices?: Invoice[]

    @HasMany(() => VoipSubscriber, {
        sourceKey: 'id',
    })
    VoipSubscribers?: VoipSubscriber[]

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @HasMany(() => Reseller, {
        sourceKey: 'id',
    })
    Resellers?: Reseller[]

    @HasMany(() => ContractsBillingProfileNetwork, {
        sourceKey: 'id',
    })
    ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    @BelongsTo(() => Customer)
    Customer?: Customer

    @BelongsTo(() => Order)
    Order?: Order

    @BelongsTo(() => Product)
    Product?: Product

    @BelongsTo(() => ProfilePackage)
    ProfilePackage?: ProfilePackage

}
