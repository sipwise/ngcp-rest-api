import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Order} from './order.entity'
import {ContractBalance} from './contract-balance.entity'

interface InvoiceAttributes {
    id?: number;
    contract_id: number;
    serial: string;
    period_start: Date;
    period_end: Date;
    amount_net: number;
    amount_vat: number;
    amount_total: number;
    data?: Uint8Array;
    sent_date?: Date;
    generator?: string;
}

@Table({
    tableName: 'invoices',
    timestamps: false,
})
export class Invoice extends Model<InvoiceAttributes, InvoiceAttributes> implements InvoiceAttributes {

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

    @ForeignKey(() => Contract)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'invoice_contract_fk',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_id!: number

    @Column({
        type: DataType.STRING(32),
    })
    @Index({
        name: 'serial_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    serial!: string

    @Column({
        type: DataType.DATE,
    })
    period_start!: Date

    @Column({
        type: DataType.DATE,
    })
    period_end!: Date

    @Column({
        type: DataType.DOUBLE(22),
    })
    amount_net!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    amount_vat!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    amount_total!: number

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    data?: Uint8Array

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    sent_date?: Date

    @Column({
        allowNull: true,
        type: DataType.ENUM('auto', 'web'),
    })
    generator?: string

    @BelongsTo(() => Contract)
    Contract?: Contract

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

    @HasMany(() => ContractBalance, {
        sourceKey: 'id',
    })
    ContractBalances?: ContractBalance[]

}
