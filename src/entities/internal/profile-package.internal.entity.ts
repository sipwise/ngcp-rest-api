import {ProfilePackageSet} from './profile-package-set.internal.entity'

export enum IntervalUnit {
    Minute = 'minute',
    Hour = 'hour',
    Day = 'day',
    Week = 'week',
    Month = 'month'
}

export enum IntervalStartMode {
    Create = 'create',
    CreateTZ = 'create_tz',
    First = '1st',
    FirstTZ = '1st_tz',
    Topup = 'topup',
    TopupInterval = 'topup_interval'
}

export enum CarryOverMode {
    CarryOver = 'carry_over',
    CarryOverTimely = 'carry_over_timely',
    Discard = 'discard'
}
interface ProfilePackageInterface {
    id?: number
    resellerId?: number
    name: string
    description: string
    initialBalance?: number
    serviceCharge?: number
    balanceIntervalUnit?: IntervalUnit
    balanceIntervalValue?: number
    balanceIntervalStartMode?: IntervalStartMode
    carryOverMode?: CarryOverMode
    timelyDurationUnit?: IntervalUnit
    timelyDurationValue?: number
    notopupDiscardIntervals?: number
    underrunLockThreshold?: number
    underrunLockLevel?: number
    underrunProfileThreshold?: number
    topupLockLevel?: number
    profilePackageSets: ProfilePackageSet[]
}

export class ProfilePackage implements ProfilePackageInterface {
    id?: number
    resellerId?: number
    name: string
    description: string
    initialBalance?: number
    serviceCharge?: number
    balanceIntervalUnit?: IntervalUnit
    balanceIntervalValue?: number
    balanceIntervalStartMode?: IntervalStartMode
    carryOverMode?: CarryOverMode
    timelyDurationUnit?: IntervalUnit
    timelyDurationValue?: number
    notopupDiscardIntervals?: number
    underrunLockThreshold?: number
    underrunLockLevel?: number
    underrunProfileThreshold?: number
    topupLockLevel?: number
    profilePackageSets: ProfilePackageSet[]

    static create(data: ProfilePackageInterface): ProfilePackage {
        const profilePackage = new ProfilePackage()

        Object.keys(data).map(key => {
            profilePackage[key] = data[key]
        })
        return profilePackage
    }
}
