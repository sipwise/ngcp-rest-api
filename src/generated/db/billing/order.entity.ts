import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {Customer} from './customer.entity'
import {Invoice} from './invoice.entity'
import {Contract} from './contract.entity'
import {Reseller} from './reseller.entity'

interface OrderAttributes {
    id?: number;
    reseller_id?: number;
    customer_id?: number;
    delivery_contact_id?: number;
    type?: string;
    state: string;
    value?: number;
    shipping_costs?: number;
    invoice_id?: number;
    modify_timestamp: Date;
    create_timestamp: Date;
    complete_timestamp: Date;
}

@Table({
    tableName: 'orders',
    timestamps: false,
})
export class Order extends Model<OrderAttributes, OrderAttributes> implements OrderAttributes {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id?: number

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
    delivery_contact_id?: number

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    shipping_costs?: number

    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'invoiceid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    invoice_id?: number

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    complete_timestamp!: Date

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
