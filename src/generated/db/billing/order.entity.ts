import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {Customer} from './customer.entity'
import {Invoice} from './invoice.entity'
import {Contract} from './contract.entity'
import {Reseller} from './reseller.entity'

@Table({
    tableName: 'orders',
    timestamps: false,
})
export class Order extends Model {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

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
        field: 'delivery_contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    deliveryContactId?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    type?: string

    @Column({
        type: DataType.ENUM('init', 'transact', 'failed', 'success'),
    })
    state!: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    value?: number

    @Column({
        field: 'shipping_costs',
        allowNull: true,
        type: DataType.INTEGER,
    })
    shippingCosts?: number

    @ForeignKey(() => Invoice)
    @Column({
        field: 'invoice_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'invoiceid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    invoiceId?: number

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
        field: 'complete_timestamp',
        type: DataType.DATE,
    })
    completeTimestamp!: Date

    @BelongsTo(() => Contact)
    Contact?: Contact

    @BelongsTo(() => Customer)
    Customer?: Customer

    @BelongsTo(() => Invoice)
    Invoice?: Invoice

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
