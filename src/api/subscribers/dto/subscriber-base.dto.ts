import {IsEmail, IsNotEmpty} from 'class-validator'

// Class SubscriberNumber must be defined before SubscriberBaseDto for transpiling to JS
class SubscriberNumber {

    @IsNotEmpty()
    ac: string

    @IsNotEmpty()
    cc: string

    @IsNotEmpty()
    is_devid: boolean

    @IsNotEmpty()
    sn: string
}

export class SubscriberBaseDto {
    @IsNotEmpty()
    administrative: boolean

    @IsNotEmpty()
    alias_numbers: SubscriberNumber[]

    @IsNotEmpty()
    display_name: string

    @IsNotEmpty()
    domain: string

    domain_id?: number

    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    external_id: string

    @IsNotEmpty()
    is_pbx_group: boolean

    @IsNotEmpty()
    is_pbx_pilot: boolean

    @IsNotEmpty()
    lock: SubscriberLockLevel

    password?: string

    @IsNotEmpty()
    pbx_extension: string

    @IsNotEmpty()
    pbx_group_ids: any[] // TODO: no definition in v1 api documentation

    @IsNotEmpty()
    pbx_groupmember_ids_id: any[] // TODO: no definition in v1 api documentation

    @IsNotEmpty()
    primary_number: SubscriberNumber

    @IsNotEmpty()
    profile_id: number

    @IsNotEmpty()
    profile_set_id: number

    @IsNotEmpty()
    status: SubscriberStatus

    @IsNotEmpty()
    timezone: string

    username?: string

    @IsNotEmpty()
    webpassword: string

    @IsNotEmpty()
    webusername: string
}

enum SubscriberLockLevel {
    Level0,
    Level1,
    Level2,
    Level3,
    Level4,
    Level5
}

enum SubscriberStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}
