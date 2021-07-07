import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {ContractCredit} from './contract-credit.entity'
import {Contract} from './contract.entity'
import {Invoice} from './invoice.entity'

interface ContractBalanceAttributes {
    id?: number;
    contract_id: number;
    cash_balance?: number;
    cash_balance_interval: number;
    free_time_balance?: number;
    free_time_balance_interval: number;
    topup_count: number;
    timely_topup_count: number;
    start: Date;
    end: Date;
    invoice_id?: number;
    underrun_profiles?: Date;
    underrun_lock?: Date;
    initial_cash_balance?: number;
    initial_free_time_balance?: number;
}

@Table({
    tableName: 'contract_balances',
    timestamps: false,
})
export class ContractBalance extends Model<ContractBalanceAttributes, ContractBalanceAttributes> implements ContractBalanceAttributes {

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
        name: 'balance_interval',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cash_balance?: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    cash_balance_interval!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    free_time_balance?: number

    @Column({
        type: DataType.INTEGER,
    })
    free_time_balance_interval!: number

    @Column({
        type: DataType.INTEGER,
    })
    topup_count!: number

    @Column({
        type: DataType.INTEGER,
    })
    timely_topup_count!: number

    @Column({
        type: DataType.DATE,
    })
    @Index({
        name: 'balance_interval',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    start!: Date

    @Column({
        type: DataType.DATE,
    })
    @Index({
        name: 'balance_interval',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    end!: Date

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
        allowNull: true,
        type: DataType.DATE,
    })
    underrun_profiles?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    underrun_lock?: Date

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    initial_cash_balance?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    initial_free_time_balance?: number

    @HasMany(() => ContractCredit, {
        sourceKey: 'id',
    })
    ContractCredits?: ContractCredit[]

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => Invoice)
    Invoice?: Invoice

}
