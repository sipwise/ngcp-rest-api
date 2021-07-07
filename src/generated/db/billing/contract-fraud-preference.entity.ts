import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ContractFraudPreferenceAttributes {
    id?: number;
    contract_id: number;
    fraud_interval_limit?: number;
    fraud_interval_lock?: number;
    fraud_interval_notify?: string;
    fraud_daily_limit?: number;
    fraud_daily_lock?: number;
    fraud_daily_notify?: string;
}

@Table({
    tableName: 'contract_fraud_preferences',
    timestamps: false,
})
export class ContractFraudPreference extends Model<ContractFraudPreferenceAttributes, ContractFraudPreferenceAttributes> implements ContractFraudPreferenceAttributes {

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
        name: 'contract_id',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    fraud_interval_limit?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraud_interval_lock?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    fraud_interval_notify?: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    fraud_daily_limit?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraud_daily_lock?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    fraud_daily_notify?: string

}
