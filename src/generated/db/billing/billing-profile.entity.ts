import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {BillingFee} from './billing-fee.entity'
import {BillingZone} from './billing-zone.entity'
import {Product} from './product.entity'
import {ContractsBillingProfileNetwork} from './contracts-billing-profile-network.entity'
import {Reseller} from './reseller.entity'

interface BillingProfileAttributes {
    id?: number;
    resellerId?: number;
    handle: string;
    name: string;
    prepaid: number;
    intervalCharge: number;
    intervalFreeTime: number;
    intervalFreeCash: number;
    intervalUnit: string;
    intervalCount: number;
    fraudIntervalLimit?: number;
    fraudIntervalLock?: number;
    fraudIntervalNotify?: string;
    fraudDailyLimit?: number;
    fraudDailyLock?: number;
    fraudDailyNotify?: string;
    fraudUseResellerRates?: number;
    currency?: string;
    status: string;
    modifyTimestamp: Date;
    createTimestamp: Date;
    terminateTimestamp: Date;
    adviceOfCharge: number;
    prepaidLibrary: string;
}

@Table({
    tableName: 'billing_profiles',
    timestamps: false,
})
export class BillingProfile extends Model<BillingProfileAttributes, BillingProfileAttributes> implements BillingProfileAttributes {

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
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'reshand_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(63),
    })
    @Index({
        name: 'reshand_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    handle!: string

    @Column({
        type: DataType.STRING(31),
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.TINYINT,
    })
    prepaid!: number

    @Column({
        field: 'interval_charge',
        type: DataType.DOUBLE(22),
    })
    intervalCharge!: number

    @Column({
        field: 'interval_free_time',
        type: DataType.INTEGER,
    })
    intervalFreeTime!: number

    @Column({
        field: 'interval_free_cash',
        type: DataType.DOUBLE(22),
    })
    intervalFreeCash!: number

    @Column({
        field: 'interval_unit',
        type: DataType.ENUM('week', 'month'),
    })
    intervalUnit!: string

    @Column({
        field: 'interval_count',
        type: DataType.TINYINT,
    })
    intervalCount!: number

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

    @Column({
        field: 'fraud_use_reseller_rates',
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraudUseResellerRates?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    currency?: string

    @Column({
        type: DataType.ENUM('active', 'terminated'),
    })
    status!: string

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

    @Column({
        field: 'terminate_timestamp',
        type: DataType.DATE,
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'reshand_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    terminateTimestamp!: Date

    @Column({
        field: 'advice_of_charge',
        type: DataType.TINYINT,
    })
    adviceOfCharge!: number

    @Column({
        field: 'prepaid_library',
        type: DataType.ENUM('libswrate', 'libinewrate'),
    })
    prepaidLibrary!: string

    @HasMany(() => BillingFee, {
        sourceKey: 'id',
    })
    BillingFees?: BillingFee[]

    @HasMany(() => BillingZone, {
        sourceKey: 'id',
    })
    BillingZones?: BillingZone[]

    @HasMany(() => Product, {
        sourceKey: 'id',
    })
    Products?: Product[]

    @HasMany(() => ContractsBillingProfileNetwork, {
        sourceKey: 'id',
    })
    ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
