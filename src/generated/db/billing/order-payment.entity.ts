import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'order_payments',
    timestamps: false,
})
export class OrderPayment extends Model {

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
        field: 'order_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'orderid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    orderId!: number

    @Column({
        field: 'payment_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'paymentid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    paymentId!: number

}
