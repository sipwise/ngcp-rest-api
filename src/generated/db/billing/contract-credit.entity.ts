import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {ContractBalance} from './contract-balance.entity'

interface ContractCreditAttributes {
    id?: number;
    balance_id: number;
    state: string;
    amount?: number;
    reason?: string;
    modify_timestamp: Date;
    create_timestamp: Date;
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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'balanceid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    balance_id!: number

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
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    @BelongsTo(() => ContractBalance)
    ContractBalance?: ContractBalance

}
