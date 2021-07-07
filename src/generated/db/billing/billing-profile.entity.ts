import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {ContractsBillingProfileNetwork} from './contracts-billing-profile-network.entity'
import {Product} from './product.entity'
import {BillingZone} from './billing-zone.entity'
import {BillingFee} from './billing-fee.entity'
import {Reseller} from './reseller.entity'

interface BillingProfileAttributes {
    id?: number;
    reseller_id?: number;
    handle: string;
    name: string;
    prepaid: number;
    interval_charge: number;
    interval_free_time: number;
    interval_free_cash: number;
    interval_unit: string;
    interval_count: number;
    fraud_interval_limit?: number;
    fraud_interval_lock?: number;
    fraud_interval_notify?: string;
    fraud_daily_limit?: number;
    fraud_daily_lock?: number;
    fraud_daily_notify?: string;
    fraud_use_reseller_rates?: number;
    currency?: string;
    status: string;
    modify_timestamp: Date;
    create_timestamp: Date;
    terminate_timestamp: Date;
    advice_of_charge: number;
    prepaid_library: string;
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
    reseller_id?: number

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
        type: DataType.DOUBLE(22),
    })
    interval_charge!: number

    @Column({
        type: DataType.INTEGER,
    })
    interval_free_time!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    interval_free_cash!: number

    @Column({
        type: DataType.ENUM('week', 'month'),
    })
    interval_unit!: string

    @Column({
        type: DataType.TINYINT,
    })
    interval_count!: number

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

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    fraud_use_reseller_rates?: number

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
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    @Column({
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
    terminate_timestamp!: Date

    @Column({
        type: DataType.TINYINT,
    })
    advice_of_charge!: number

    @Column({
        type: DataType.ENUM('libswrate', 'libinewrate'),
    })
    prepaid_library!: string

    @HasMany(() => ContractsBillingProfileNetwork, {
        sourceKey: 'id',
    })
    ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    @HasMany(() => Product, {
        sourceKey: 'id',
    })
    Products?: Product[]

    @HasMany(() => BillingZone, {
        sourceKey: 'id',
    })
    BillingZones?: BillingZone[]

    @HasMany(() => BillingFee, {
        sourceKey: 'id',
    })
    BillingFees?: BillingFee[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
