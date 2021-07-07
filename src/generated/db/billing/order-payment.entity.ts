import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface OrderPaymentAttributes {
    id?: number;
    order_id: number;
    payment_id: number;
}

@Table({
    tableName: 'order_payments',
    timestamps: false,
})
export class OrderPayment extends Model<OrderPaymentAttributes, OrderPaymentAttributes> implements OrderPaymentAttributes {

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

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'orderid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    order_id!: number

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'paymentid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    payment_id!: number

}
