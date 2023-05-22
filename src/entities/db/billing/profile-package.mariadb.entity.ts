import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {CarryOverMode, IntervalStartMode, IntervalUnit} from '../../internal/profile-package.internal.entity'
import {internal} from '../../../entities'
import {Admin} from './admin.mariadb.entity'
import {PackageProfileSet} from './package-profile-set.mariadb.entity'

@Entity({
    name: 'profile_packages',
    database: 'billing',
})
export class ProfilePackage extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
        default: null,
    })
        reseller_id?: number

    @Column({
        nullable: false,
        type: 'varchar',
        length: 255,
    })
        name: string

    @Column({
        nullable: false,
        type: 'varchar',
        length: 255,
    })
        description: string

    @Column({
        nullable: false,
        type: 'double',
        default: 0,
    })
        initial_balance: number

    @Column({
        nullable: false,
        type: 'double',
        default: 0,
    })
        service_charge: number

    @Column({
        nullable: false,
        type: 'enum',
        enum: IntervalUnit,
        default: IntervalUnit.Month,
    })
        balance_interval_unit: IntervalUnit

    @Column({
        nullable: false,
        type: 'int',
        width: 3,
        default: 1,
    })
        balance_interval_value: number

    @Column({
        nullable: false,
        type: 'enum',
        enum: IntervalStartMode,
        default: IntervalStartMode.First,
    })
        balance_interval_start_mode: IntervalStartMode

    @Column({
        nullable: false,
        type: 'enum',
        enum: CarryOverMode,
        default: CarryOverMode.CarryOver,
    })
        carry_over_mode: CarryOverMode

    @Column({
        nullable: true,
        type: 'enum',
        enum: IntervalUnit,
        default: null,
    })
        timely_duration_unit: IntervalUnit

    @Column({
        nullable: true,
        type: 'int',
        width: 3,
    })
        timely_duration_value: number

    @Column({
        nullable: true,
        type: 'int',
        width: 3,
    })
        notopup_discard_intervals: number

    @Column({
        nullable: true,
        type: 'double',
    })
        underrun_lock_threshold: number

    @Column({
        nullable: true,
        type: 'tinyint',
        width: 3,
    })
        underrun_lock_level: number

    @Column({
        nullable: true,
        type: 'double',
    })
        underrun_profile_threshold: number

    @Column({
        nullable: true,
        type: 'tinyint',
        width: 3,
    })
        topup_lock_level: number

    @OneToMany(() => PackageProfileSet, pps => pps.package)
    packageProfileSets: PackageProfileSet[]

    toInternal(): internal.ProfilePackage {
        return internal.ProfilePackage.create({
            balanceIntervalStartMode: this.balance_interval_start_mode,
            balanceIntervalUnit: this.balance_interval_unit,
            balanceIntervalValue: this.balance_interval_value,
            carryOverMode: this.carry_over_mode,
            description: this.description,
            id: this.id,
            initialBalance: this.initial_balance,
            name: this.name,
            notopupDiscardIntervals: this.notopup_discard_intervals,
            profilePackageSets: this.packageProfileSets.map(set => set.toInternal()),
            resellerId: this.reseller_id,
            serviceCharge: this.service_charge,
            timelyDurationUnit: this.timely_duration_unit,
            timelyDurationValue: this.timely_duration_value,
            topupLockLevel: this.topup_lock_level,
            underrunLockLevel: this.underrun_lock_level,
            underrunLockThreshold: this.underrun_lock_threshold,
            underrunProfileThreshold: this.underrun_profile_threshold,
        })
    }

    fromInternal(profilePackage: internal.ProfilePackage): ProfilePackage {
        return this
    }
}
