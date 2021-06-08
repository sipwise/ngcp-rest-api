import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'contract_fraud_preferences',
    timestamps: false,
})
export class ContractFraudPreference extends Model {

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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contract_id',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contractId!: number

    @Column({
        field: 'fraud_interval_limit',
        allowNull: true,
        type: DataType.INTEGER,
    })
    fraudIntervalLimit?: number

    @Column({
        field: 'fraud_interval_lock',
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraudIntervalLock?: number

    @Column({
        field: 'fraud_interval_notify',
        allowNull: true,
        type: DataType.STRING(255),
    })
    fraudIntervalNotify?: string

    @Column({
        field: 'fraud_daily_limit',
        allowNull: true,
        type: DataType.INTEGER,
    })
    fraudDailyLimit?: number

    @Column({
        field: 'fraud_daily_lock',
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraudDailyLock?: number

    @Column({
        field: 'fraud_daily_notify',
        allowNull: true,
        type: DataType.STRING(255),
    })
    fraudDailyNotify?: string

}
