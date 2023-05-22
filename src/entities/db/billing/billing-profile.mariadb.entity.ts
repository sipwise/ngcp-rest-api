import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {BillingProfileStatus, IntervalUnit, PrepaidLibrary} from '../../internal/billing-profile.internal.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'billing_profiles',
    database: 'billing',
})
export class BillingProfile extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
    })
        reseller_id?: number

    @Column({
        nullable: false,
        type: 'varchar',
        length: 63,
    })
        handle: string

    @Column({
        nullable: false,
        type: 'varchar',
        length: 31,
    })
        name: string

    @Column({
        nullable: false,
        type: 'boolean',
        default: false,
    })
        prepaid: boolean

    @Column({
        nullable: false,
        type: 'double',
        default: 0,
    })
        interval_charge: number

    @Column({
        nullable: false,
        type: 'int',
        width: 5,
        default: 0,
    })
        interval_free_time: number

    @Column({
        nullable: false,
        type: 'double',
        default: 0,
    })
        interval_free_cash: number

    @Column({
        nullable: false,
        type: 'enum',
        enum: IntervalUnit,
        default: IntervalUnit.Month,
    })
        interval_unit: IntervalUnit

    @Column({
        nullable: false,
        type: 'tinyint',
        width: 3,
        default: 1,
    })
        interval_count: number

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
        default: null,
    })
        fraud_interval_limit?: number

    @Column({
        nullable: true,
        type: 'tinyint',
        width: 3,
        default: null,
    })
        fraud_interval_lock?: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
        default: null,
    })
        fraud_interval_notify?: string

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
        default: null,
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
        nullable: true,
        type: 'tinyint',
        width: 3,
        default: 0,
    })
        fraud_use_reseller_rates?: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
        default: null,
    })
        currency?: string

    @Column({
        nullable: false,
        type: 'enum',
        enum: BillingProfileStatus,
        default: BillingProfileStatus.Active,
    })
        status: BillingProfileStatus

    @Column({
        type: 'date',
    })
        modify_timestamp?: Date

    @Column({
        type: 'date',
    })
        create_timestamp?: Date

    @Column({
        type: 'date',
    })
        terminate_timestamp?: Date

    @Column({
        nullable: false,
        type: 'boolean',
        default: false,
    })
        advice_of_charge: boolean

    @Column({
        nullable: false,
        type: 'enum',
        enum: PrepaidLibrary,
        default: PrepaidLibrary.LibswRate,
    })
        prepaid_library: PrepaidLibrary

    @Column({
        nullable: false,
        type: 'boolean',
        default: false,
    })
        ignore_domain: boolean

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
