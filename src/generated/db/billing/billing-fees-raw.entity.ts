import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface BillingFeesRawAttributes {
    id?: number;
    billing_profile_id: number;
    billing_zone_id?: number;
    source: string;
    destination: string;
    direction: string;
    type: string;
    onpeak_init_rate: number;
    onpeak_init_interval: number;
    onpeak_follow_rate: number;
    onpeak_follow_interval: number;
    offpeak_init_rate: number;
    offpeak_init_interval: number;
    offpeak_follow_rate: number;
    offpeak_follow_interval: number;
    onpeak_use_free_time: number;
    match_mode: string;
    onpeak_extra_rate: number;
    onpeak_extra_second?: number;
    offpeak_extra_rate: number;
    offpeak_extra_second?: number;
    offpeak_use_free_time: number;
    aoc_pulse_amount_per_message: number;
}

@Table({
    tableName: 'billing_fees_raw',
    timestamps: false,
})
export class BillingFeesRaw extends Model<BillingFeesRawAttributes, BillingFeesRawAttributes> implements BillingFeesRawAttributes {

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
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'showfeesc_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_profile_id!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'zoneid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'showfeesc_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_zone_id?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    source!: string

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'showfeesc_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    destination!: string

    @Column({
        type: DataType.ENUM('in', 'out'),
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    direction!: string

    @Column({
        type: DataType.ENUM('call', 'sms'),
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    type!: string

    @Column({
        type: DataType.DOUBLE(22),
    })
    onpeak_init_rate!: number

    @Column({
        type: DataType.INTEGER,
    })
    onpeak_init_interval!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    onpeak_follow_rate!: number

    @Column({
        type: DataType.INTEGER,
    })
    onpeak_follow_interval!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    offpeak_init_rate!: number

    @Column({
        type: DataType.INTEGER,
    })
    offpeak_init_interval!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    offpeak_follow_rate!: number

    @Column({
        type: DataType.INTEGER,
    })
    offpeak_follow_interval!: number

    @Column({
        type: DataType.TINYINT,
    })
    onpeak_use_free_time!: number

    @Column({
        type: DataType.ENUM('regex_longest_pattern', 'regex_longest_match', 'prefix', 'exact_destination'),
    })
    @Index({
        name: 'bfr_destsrcdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'bfr_srcdestdir_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    match_mode!: string

    @Column({
        type: DataType.DOUBLE(22),
    })
    onpeak_extra_rate!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    onpeak_extra_second?: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    offpeak_extra_rate!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    offpeak_extra_second?: number

    @Column({
        type: DataType.TINYINT,
    })
    offpeak_use_free_time!: number

    @Column({
        type: DataType.DOUBLE(22),
    })
    aoc_pulse_amount_per_message!: number

}
