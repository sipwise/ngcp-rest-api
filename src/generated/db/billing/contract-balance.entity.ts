import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {ContractCredit} from './contract-credit.entity'
import {Contract} from './contract.entity'
import {Invoice} from './invoice.entity'

interface ContractBalanceAttributes {
    id?: number;
    contractId: number;
    cashBalance?: number;
    cashBalanceInterval: number;
    freeTimeBalance?: number;
    freeTimeBalanceInterval: number;
    topupCount: number;
    timelyTopupCount: number;
    start: Date;
    end: Date;
    invoiceId?: number;
    underrunProfiles?: Date;
    underrunLock?: Date;
    initialCashBalance?: number;
    initialFreeTimeBalance?: number;
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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'balance_interval',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contractId!: number

    @Column({
        field: 'cash_balance',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cashBalance?: number

    @Column({
        field: 'cash_balance_interval',
        type: DataType.DOUBLE(22),
    })
    cashBalanceInterval!: number

    @Column({
        field: 'free_time_balance',
        allowNull: true,
        type: DataType.INTEGER,
    })
    freeTimeBalance?: number

    @Column({
        field: 'free_time_balance_interval',
        type: DataType.INTEGER,
    })
    freeTimeBalanceInterval!: number

    @Column({
        field: 'topup_count',
        type: DataType.INTEGER,
    })
    topupCount!: number

    @Column({
        field: 'timely_topup_count',
        type: DataType.INTEGER,
    })
    timelyTopupCount!: number

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
        field: 'underrun_profiles',
        allowNull: true,
        type: DataType.DATE,
    })
    underrunProfiles?: Date

    @Column({
        field: 'underrun_lock',
        allowNull: true,
        type: DataType.DATE,
    })
    underrunLock?: Date

    @Column({
        field: 'initial_cash_balance',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    initialCashBalance?: number

    @Column({
        field: 'initial_free_time_balance',
        allowNull: true,
        type: DataType.INTEGER,
    })
    initialFreeTimeBalance?: number

    @HasMany(() => ContractCredit, {
        sourceKey: 'id',
    })
    ContractCredits?: ContractCredit[]

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => Invoice)
    Invoice?: Invoice

}
