import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Voucher} from './voucher.entity'
import {Reseller} from './reseller.entity'

@Table({
    tableName: 'profile_packages',
    timestamps: false,
})
export class ProfilePackage extends Model {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pp_resname_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'pp_resname_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.STRING(255),
    })
    description!: string

    @Column({
        field: 'initial_balance',
        type: DataType.DOUBLE(22),
    })
    initialBalance!: number

    @Column({
        field: 'service_charge',
        type: DataType.DOUBLE(22),
    })
    serviceCharge!: number

    @Column({
        field: 'balance_interval_unit',
        type: DataType.ENUM('minute', 'hour', 'day', 'week', 'month'),
    })
    balanceIntervalUnit!: string

    @Column({
        field: 'balance_interval_value',
        type: DataType.INTEGER,
    })
    balanceIntervalValue!: number

    @Column({
        field: 'balance_interval_start_mode',
        type: DataType.ENUM('create', 'create_tz', '1st', '1st_tz', 'topup', 'topup_interval'),
    })
    balanceIntervalStartMode!: string

    @Column({
        field: 'carry_over_mode',
        type: DataType.ENUM('carry_over', 'carry_over_timely', 'discard'),
    })
    carryOverMode!: string

    @Column({
        field: 'timely_duration_unit',
        allowNull: true,
        type: DataType.ENUM('minute', 'hour', 'day', 'week', 'month'),
    })
    timelyDurationUnit?: string

    @Column({
        field: 'timely_duration_value',
        allowNull: true,
        type: DataType.INTEGER,
    })
    timelyDurationValue?: number

    @Column({
        field: 'notopup_discard_intervals',
        allowNull: true,
        type: DataType.INTEGER,
    })
    notopupDiscardIntervals?: number

    @Column({
        field: 'underrun_lock_threshold',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    underrunLockThreshold?: number

    @Column({
        field: 'underrun_lock_level',
        allowNull: true,
        type: DataType.TINYINT,
    })
    underrunLockLevel?: number

    @Column({
        field: 'underrun_profile_threshold',
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    underrunProfileThreshold?: number

    @Column({
        field: 'topup_lock_level',
        allowNull: true,
        type: DataType.TINYINT,
    })
    topupLockLevel?: number

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
