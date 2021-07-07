import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Voucher} from './voucher.entity'
import {Contract} from './contract.entity'
import {Reseller} from './reseller.entity'

interface ProfilePackageAttributes {
    id?: number;
    reseller_id?: number;
    name: string;
    description: string;
    initial_balance: number;
    service_charge: number;
    balance_interval_unit: string;
    balance_interval_value: number;
    balance_interval_start_mode: string;
    carry_over_mode: string;
    timely_duration_unit?: string;
    timely_duration_value?: number;
    notopup_discard_intervals?: number;
    underrun_lock_threshold?: number;
    underrun_lock_level?: number;
    underrun_profile_threshold?: number;
    topup_lock_level?: number;
}

@Table({
    tableName: 'profile_packages',
    timestamps: false,
})
export class ProfilePackage extends Model<ProfilePackageAttributes, ProfilePackageAttributes> implements ProfilePackageAttributes {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pp_resname_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    reseller_id?: number

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
        type: DataType.DOUBLE(22),
    })
    initial_balance!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    service_charge!: number

    @Column({
        type: DataType.ENUM('minute', 'hour', 'day', 'week', 'month'),
    })
    balance_interval_unit!: string

    @Column({
        type: DataType.INTEGER,
    })
    balance_interval_value!: number

    @Column({
        type: DataType.ENUM('create', 'create_tz', '1st', '1st_tz', 'topup', 'topup_interval'),
    })
    balance_interval_start_mode!: string

    @Column({
        type: DataType.ENUM('carry_over', 'carry_over_timely', 'discard'),
    })
    carry_over_mode!: string

    @Column({
        allowNull: true,
        type: DataType.ENUM('minute', 'hour', 'day', 'week', 'month'),
    })
    timely_duration_unit?: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    timely_duration_value?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    notopup_discard_intervals?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    underrun_lock_threshold?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    underrun_lock_level?: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    underrun_profile_threshold?: number

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    topup_lock_level?: number

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
