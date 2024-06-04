import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {BillingProfileStatus, IntervalUnit, PrepaidLibrary} from '../../internal/billing-profile.internal.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'billing_profiles',
    database: 'billing',
})
export class BillingProfile extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 63,
        nullable: false,
    })
        handle!: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        prepaid!: boolean

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        interval_charge!: number

    @Column({
        type: 'int',
        width: 5,
        nullable: false,
        default: 0,
    })
        interval_free_time!: number

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        interval_free_cash!: number

    @Column({
        type: 'enum',
        enum: IntervalUnit,
        nullable: false,
        default: IntervalUnit.Month,
    })
        interval_unit!: IntervalUnit

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: false,
        default: 1,
    })
        interval_count!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        fraud_interval_limit?: number

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: true,
    })
        fraud_interval_lock?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        fraud_interval_notify?: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        fraud_daily_limit?: number

    @Column({
        nullable: true,
        type: 'tinyint',
        width: 3,
        default: null,
    })
        fraud_daily_lock?: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
        default: null,
    })
        fraud_daily_notify?: string

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: true,
        default: 0,
    })
        fraud_use_reseller_rates?: number

    @Column({
        type: 'varchar',
        length: 31,
        nullable: true,
    })
        currency?: string

    @Column({
        type: 'enum',
        enum: BillingProfileStatus,
        nullable: false,
        default: BillingProfileStatus.Active,
    })
        status!: BillingProfileStatus

    @Column({
        type: 'date',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        create_timestamp!: Date

    @Column({
        type: 'date',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        terminate_timestamp!: Date

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        advice_of_charge!: boolean

    @Column({
        type: 'enum',
        enum: PrepaidLibrary,
        nullable: false,
        default: PrepaidLibrary.LibswRate,
    })
        prepaid_library!: PrepaidLibrary

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        ignore_domain!: boolean

    fromInternal(profile: internal.BillingProfile): BillingProfile {
        this.id = profile.id
        this.handle = profile.handle
        this.name = profile.name
        this.prepaid_library = profile.prepaidLibrary
        this.reseller_id = profile.resellerId
        this.status = profile.status
        return this
    }

    toInternal(): internal.BillingProfile {
        return internal.BillingProfile.create({
            handle: this.handle,
            id: this.id,
            resellerId: this.reseller_id,
            name: this.name,
            prepaidLibrary: this.prepaid_library,
            status: this.status,
        })
    }
}
