import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {ContractsBillingProfileNetwork} from './contracts-billing-profile-network.entity'
import {Voucher} from './voucher.entity'
import {Invoice} from './invoice.entity'
import {VoipSubscriber} from './voip-subscriber.entity'
import {Reseller} from './reseller.entity'
import {ContractBalance} from './contract-balance.entity'
import {Customer} from './customer.entity'
import {Order} from './order.entity'
import {Product} from './product.entity'
import {ProfilePackage} from './profile-package.entity'

interface ContractAttributes {
    id?: number;
    customer_id?: number;
    contact_id?: number;
    order_id?: number;
    profile_package_id?: number;
    status: string;
    external_id?: string;
    modify_timestamp: Date;
    create_timestamp: Date;
    activate_timestamp?: Date;
    terminate_timestamp?: Date;
    max_subscribers?: number;
    send_invoice: number;
    subscriber_email_template_id?: number;
    passreset_email_template_id?: number;
    invoice_email_template_id?: number;
    invoice_template_id?: number;
    vat_rate: number;
    add_vat: number;
    product_id: number;
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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customer_id?: number

    @ForeignKey(() => Contact)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contact_id?: number

    @ForeignKey(() => Order)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'orderid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    order_id?: number

    @ForeignKey(() => ProfilePackage)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'c_package_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profile_package_id?: number

    @Column({
        type: DataType.ENUM('pending', 'active', 'locked', 'terminated'),
    })
    status!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    external_id?: string

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    activate_timestamp?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    terminate_timestamp?: Date

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    max_subscribers?: number

    @Column({
        type: DataType.TINYINT,
    })
    send_invoice!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    subscriber_email_template_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    passreset_email_template_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    invoice_email_template_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    invoice_template_id?: number

    @Column({
        type: DataType.TINYINT,
    })
    vat_rate!: number

    @Column({
        type: DataType.TINYINT,
    })
    add_vat!: number

    @ForeignKey(() => Product)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'c_productid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    product_id!: number

    @BelongsTo(() => Contact)
    Contact?: Contact

    @HasMany(() => ContractsBillingProfileNetwork, {
        sourceKey: 'id',
    })
    ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @HasMany(() => Invoice, {
        sourceKey: 'id',
    })
    Invoices?: Invoice[]

    @HasMany(() => VoipSubscriber, {
        sourceKey: 'id',
    })
    VoipSubscribers?: VoipSubscriber[]

    @HasMany(() => Reseller, {
        sourceKey: 'id',
    })
    Resellers?: Reseller[]

    @HasMany(() => ContractBalance, {
        sourceKey: 'id',
    })
    ContractBalances?: ContractBalance[]

    @BelongsTo(() => Customer)
    Customer?: Customer

    @BelongsTo(() => Order)
    Order?: Order

    @BelongsTo(() => Product)
    Product?: Product

    @BelongsTo(() => ProfilePackage)
    ProfilePackage?: ProfilePackage

}
