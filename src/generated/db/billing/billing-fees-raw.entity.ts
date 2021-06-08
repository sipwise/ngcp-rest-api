import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'billing_fees_raw',
    timestamps: false,
})
export class BillingFeesRaw extends Model {

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
        field: 'billing_profile_id',
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
    billingProfileId!: number

    @Column({
        field: 'billing_zone_id',
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
    billingZoneId?: number

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
        field: 'onpeak_init_rate',
        type: DataType.DOUBLE(22),
    })
    onpeakInitRate!: number

    @Column({
        field: 'onpeak_init_interval',
        type: DataType.INTEGER,
    })
    onpeakInitInterval!: number

    @Column({
        field: 'onpeak_follow_rate',
        type: DataType.DOUBLE(22),
    })
    onpeakFollowRate!: number

    @Column({
        field: 'onpeak_follow_interval',
        type: DataType.INTEGER,
    })
    onpeakFollowInterval!: number

    @Column({
        field: 'offpeak_init_rate',
        type: DataType.DOUBLE(22),
    })
    offpeakInitRate!: number

    @Column({
        field: 'offpeak_init_interval',
        type: DataType.INTEGER,
    })
    offpeakInitInterval!: number

    @Column({
        field: 'offpeak_follow_rate',
        type: DataType.DOUBLE(22),
    })
    offpeakFollowRate!: number

    @Column({
        field: 'offpeak_follow_interval',
        type: DataType.INTEGER,
    })
    offpeakFollowInterval!: number

    @Column({
        field: 'onpeak_use_free_time',
        type: DataType.TINYINT,
    })
    onpeakUseFreeTime!: number

    @Column({
        field: 'match_mode',
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
    matchMode!: string

    @Column({
        field: 'onpeak_extra_rate',
        type: DataType.DOUBLE(22),
    })
    onpeakExtraRate!: number

    @Column({
        field: 'onpeak_extra_second',
        allowNull: true,
        type: DataType.INTEGER,
    })
    onpeakExtraSecond?: number

    @Column({
        field: 'offpeak_extra_rate',
        type: DataType.DOUBLE(22),
    })
    offpeakExtraRate!: number

    @Column({
        field: 'offpeak_extra_second',
        allowNull: true,
        type: DataType.INTEGER,
    })
    offpeakExtraSecond?: number

    @Column({
        field: 'offpeak_use_free_time',
        type: DataType.TINYINT,
    })
    offpeakUseFreeTime!: number

    @Column({
        field: 'aoc_pulse_amount_per_message',
        type: DataType.DOUBLE(22),
    })
    aocPulseAmountPerMessage!: number

}
