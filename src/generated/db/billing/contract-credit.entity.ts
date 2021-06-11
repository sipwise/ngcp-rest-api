import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {ContractBalance} from './contract-balance.entity'

interface ContractCreditAttributes {
    id?: number;
    balanceId: number;
    state: string;
    amount?: number;
    reason?: string;
    modifyTimestamp: Date;
    createTimestamp: Date;
}

@Table({
    tableName: 'contract_credits',
    timestamps: false,
})
export class ContractCredit extends Model<ContractCreditAttributes, ContractCreditAttributes> implements ContractCreditAttributes {

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

    @ForeignKey(() => ContractBalance)
    @Column({
        field: 'balance_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'balanceid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    balanceId!: number

    @Column({
        type: DataType.ENUM('init', 'transact', 'charged', 'failed', 'success'),
    })
    state!: string

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    amount?: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    reason?: string

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

    @BelongsTo(() => ContractBalance)
    ContractBalance?: ContractBalance

}
