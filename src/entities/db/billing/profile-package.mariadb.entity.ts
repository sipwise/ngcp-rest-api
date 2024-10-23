import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {CarryOverMode, IntervalStartMode, IntervalUnit} from '../../internal/profile-package.internal.entity'
import {internal} from '../../../entities'
import {PackageProfileSet} from './package-profile-set.mariadb.entity'

@Entity({
    name: 'profile_packages',
    database: 'billing',
})
export class ProfilePackage extends BaseEntity {
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
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        description!: string

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        initial_balance!: number

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        service_charge!: number

    @Column({
        type: 'enum',
        enum: IntervalUnit,
        nullable: false,
        default: IntervalUnit.Month,
    })
        balance_interval_unit!: IntervalUnit

    @Column({
        type: 'int',
        width: 3,
        unsigned: true,
        nullable: false,
        default: 1,
    })
        balance_interval_value!: number

    @Column({
        type: 'enum',
        enum: IntervalStartMode,
        nullable: false,
        default: IntervalStartMode.First,
    })
        balance_interval_start_mode!: IntervalStartMode

    @Column({
        type: 'enum',
        enum: CarryOverMode,
        nullable: false,
        default: CarryOverMode.CarryOver,
    })
        carry_over_mode!: CarryOverMode

    @Column({
        type: 'enum',
        enum: IntervalUnit,
        nullable: true,
    })
        timely_duration_unit?: IntervalUnit

    @Column({
        type: 'int',
        width: 3,
        unsigned: true,
        nullable: true,
    })
        timely_duration_value?: number

    @Column({
        type: 'int',
        width: 3,
        unsigned: true,
        nullable: true,
    })
        notopup_discard_intervals?: number

    @Column({
        type: 'double',
        nullable: true,
    })
        underrun_lock_threshold?: number

    @Column({
        type: 'tinyint',
        width: 3,
        nullable: true,
    })
        underrun_lock_level?: number

    @Column({
        type: 'double',
        nullable: true,
    })
        underrun_profile_threshold?: number

    @Column({
        type: 'tinyint',
        width: 3,
        nullable: true,
    })
        topup_lock_level?: number

    @OneToMany(() => PackageProfileSet, pps => pps.package)
        packageProfileSets!: PackageProfileSet[]

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

    fromInternal(_profilePackage: internal.ProfilePackage): ProfilePackage {
        return this
    }
}
