import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {ContractBalance} from './contract-balance.entity'
import {Order} from './order.entity'

@Table({
    tableName: 'invoices',
    timestamps: false,
})
export class Invoice extends Model {

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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'invoice_contract_fk',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractId!: number

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
        field: 'period_start',
        type: DataType.DATE,
    })
    periodStart!: Date

    @Column({
        field: 'period_end',
        type: DataType.DATE,
    })
    periodEnd!: Date

    @Column({
        field: 'amount_net',
        type: DataType.DOUBLE(22),
    })
    amountNet!: number

    @Column({
        field: 'amount_vat',
        type: DataType.DOUBLE(22),
    })
    amountVat!: number

    @Column({
        field: 'amount_total',
        type: DataType.DOUBLE(22),
    })
    amountTotal!: number

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    data?: Uint8Array

    @Column({
        field: 'sent_date',
        allowNull: true,
        type: DataType.DATE,
    })
    sentDate?: Date

    @Column({
        allowNull: true,
        type: DataType.ENUM('auto', 'web'),
    })
    generator?: string

    @BelongsTo(() => Contract)
    Contract?: Contract

    @HasMany(() => ContractBalance, {
        sourceKey: 'id',
    })
    ContractBalances?: ContractBalance[]

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

}
