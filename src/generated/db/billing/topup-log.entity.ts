import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface TopupLogAttributes {
    id?: number;
    username?: string;
    timestamp: string;
    type: string;
    outcome: string;
    message?: string;
    subscriberId?: number;
    contractId?: number;
    amount?: number;
    voucherId?: number;
    cashBalanceBefore?: number;
    cashBalanceAfter?: number;
    packageBeforeId?: number;
    packageAfterId?: number;
    profileBeforeId?: number;
    profileAfterId?: number;
    lockLevelBefore?: number;
    lockLevelAfter?: number;
    contractBalanceBeforeId?: number;
    contractBalanceAfterId?: number;
    requestToken?: string;
}

@Table({
    tableName: 'topup_log',
    timestamps: false,
})
export class TopupLog extends Model<TopupLogAttributes, TopupLogAttributes> implements TopupLogAttributes {

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
        allowNull: true,
        type: DataType.STRING(127),
    })
    username?: string

    @Column({
        type: DataType.DECIMAL(13, 3),
    })
    @Index({
        name: 'tl_timestamp_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    timestamp!: string

    @Column({
        type: DataType.ENUM('cash', 'voucher', 'set_balance'),
    })
    type!: string

    @Column({
        type: DataType.ENUM('ok', 'failed'),
    })
    outcome!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    message?: string

    @Column({
        field: 'subscriber_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_subscriber_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriberId?: number

    @Column({
        field: 'contract_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_contract_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractId?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    amount?: number

    @Column({
        field: 'voucher_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_voucher_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    voucherId?: number

    @Column({
        field: 'cash_balance_before',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cashBalanceBefore?: number

    @Column({
        field: 'cash_balance_after',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cashBalanceAfter?: number

    @Column({
        field: 'package_before_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_package_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    packageBeforeId?: number

    @Column({
        field: 'package_after_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_package_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    packageAfterId?: number

    @Column({
        field: 'profile_before_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_profile_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profileBeforeId?: number

    @Column({
        field: 'profile_after_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_profile_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profileAfterId?: number

    @Column({
        field: 'lock_level_before',
        allowNull: true,
        type: DataType.TINYINT,
    })
    lockLevelBefore?: number

    @Column({
        field: 'lock_level_after',
        allowNull: true,
        type: DataType.TINYINT,
    })
    lockLevelAfter?: number

    @Column({
        field: 'contract_balance_before_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_balance_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractBalanceBeforeId?: number

    @Column({
        field: 'contract_balance_after_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_balance_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractBalanceAfterId?: number

    @Column({
        field: 'request_token',
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'tl_requesttoken_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    requestToken?: string

}
