import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface TopupLogAttributes {
    id?: number;
    username?: string;
    timestamp: string;
    type: string;
    outcome: string;
    message?: string;
    subscriber_id?: number;
    contract_id?: number;
    amount?: number;
    voucher_id?: number;
    cash_balance_before?: number;
    cash_balance_after?: number;
    package_before_id?: number;
    package_after_id?: number;
    profile_before_id?: number;
    profile_after_id?: number;
    lock_level_before?: number;
    lock_level_after?: number;
    contract_balance_before_id?: number;
    contract_balance_after_id?: number;
    request_token?: string;
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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_subscriber_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriber_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_contract_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_id?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    amount?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_voucher_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    voucher_id?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cash_balance_before?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    cash_balance_after?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_package_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    package_before_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_package_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    package_after_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_profile_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profile_before_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_profile_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profile_after_id?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    lock_level_before?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    lock_level_after?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_balance_before_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_balance_before_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'tl_balance_after_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_balance_after_id?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'tl_requesttoken_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    request_token?: string

}
