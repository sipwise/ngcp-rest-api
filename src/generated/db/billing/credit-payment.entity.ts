import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface CreditPaymentAttributes {
    id?: number;
    creditId: number;
    paymentId: number;
}

@Table({
    tableName: 'credit_payments',
    timestamps: false,
})
export class CreditPayment extends Model<CreditPaymentAttributes, CreditPaymentAttributes> implements CreditPaymentAttributes {

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
        field: 'credit_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'creditid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    creditId!: number

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
