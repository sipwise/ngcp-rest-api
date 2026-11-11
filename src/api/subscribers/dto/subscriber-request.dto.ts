import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator'

import {IsValidPassword} from '~/decorators/is-valid-password.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {
    SubscriberAliasNumber,
    SubscriberNumber,
    SubscriberPbxHuntCancelMode,
    SubscriberPbxHuntPolicy,
} from '~/entities/internal/subscriber.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

const writableStatuses = [
    VoipSubscriberStatus.Active,
    VoipSubscriberStatus.Locked,
]
const lockLevels = [
    0,
    1,
    2,
    3,
    4,
    5,
]
// no spaces, no leading, trailing or double dots
const identifierPattern = /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9+=,;_.~'()!*-]+$/

export class SubscriberNumberRequestDto {
    @IsInt()
    @Min(1)
    @Max(9999)
    @ApiProperty({example: 43, description: 'Country code'})
        cc: number

    @IsString()
    @Matches(/^\d{0,7}$/, {message: 'ac must be up to 7 digits'})
    @ApiProperty({example: '1', description: 'Area code, may be empty'})
        ac: string

    @IsString()
    @Matches(/^\d{1,31}$/, {message: 'sn must be 1 to 31 digits'})
    @ApiProperty({example: '9999', description: 'Subscriber number'})
        sn: string

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({description: 'Ignored, accepted so a read item can be sent back'})
        number_id?: number

    constructor(number?: SubscriberNumber) {
        if (!number) return
        this.cc = number.cc
        this.ac = number.ac
        this.sn = number.sn
        this.number_id = number.numberId
    }

    toInternal(): SubscriberNumber {
        return {cc: this.cc, ac: this.ac ?? '', sn: this.sn}
    }
}

export class SubscriberAliasNumberRequestDto extends SubscriberNumberRequestDto {
    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false, description: 'Device id alias'})
        is_devid?: boolean

    constructor(number?: SubscriberAliasNumber) {
        super(number)
        if (!number) return
        this.is_devid = number.isDevId
    }

    /**
     * isDevId stays undefined when omitted, so comparisons with the stored alias skip it
     */
    toInternal(): SubscriberAliasNumber {
        return {...super.toInternal(), isDevId: this.is_devid}
    }
}

/**
 * Subscriber as sent by any role; which fields a role may change is checked by the service.
 * Omitted fields stay undefined in the internal entity: PUT resets the writable ones and keeps the read-only ones.
 */
export class SubscriberRequestDto implements RequestDto {
    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({description: 'Customer, required for admin roles on create; can not be changed'})
        customer_id?: number

    @IsNotEmpty()
    @IsString()
    @MaxLength(127)
    @Matches(identifierPattern, {message: 'username may contain only A-Z a-z 0-9 + = , ; _ . ~ \' ( ) ! * - and no leading, trailing or double dots'})
    @ApiProperty({example: 'alice', description: 'SIP username, can not be changed'})
        username: string

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({description: 'Domain name, domain or domain_id is required for admin roles; can not be changed'})
        domain?: string

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({description: 'Domain id, alternative to domain; can not be changed'})
        domain_id?: number

    @IsOptional()
    @IsIn(writableStatuses)
    @ApiPropertyOptional({enum: writableStatuses, default: VoipSubscriberStatus.Active, description: 'Use DELETE to terminate a subscriber'})
        status?: VoipSubscriberStatus

    @IsOptional()
    @IsIn([...lockLevels, ...lockLevels.map(String)])
    @ApiPropertyOptional({
        type: 'integer',
        nullable: true,
        minimum: 0,
        maximum: 5,
        description: 'Lock level, 0 or null = unlocked; locking the subscriber sets 4 unless given',
    })
        lock?: number | string | null

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({nullable: true})
        external_id?: string | null

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    @ApiPropertyOptional({nullable: true})
        email?: string | null

    @IsOptional()
    @IsString()
    @MaxLength(80)
    @ApiPropertyOptional({nullable: true})
        timezone?: string | null

    @IsOptional()
    @IsString()
    @MaxLength(127)
    @ApiPropertyOptional({nullable: true, description: 'Login for the web interfaces'})
        webusername?: string | null

    @IsOptional()
    @IsString()
    @MaxLength(40)
    @IsValidPassword({username: 'username', sip: true})
    @ApiPropertyOptional({description: 'SIP password, write-only; required on create unless generated, unchanged if omitted'})
        password?: string

    @IsOptional()
    @IsString()
    @IsValidPassword({username: 'webusername'})
    @ApiPropertyOptional({description: 'Web password, write-only; unchanged if omitted'})
        webpassword?: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false, description: 'Subscriber administrator of its customer'})
        administrative?: boolean

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true})
        profile_set_id?: number | null

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true, description: 'Profile of profile_set_id, its default profile if omitted'})
        profile_id?: number | null

    @IsOptional()
    @ValidateNested()
    @Type(() => SubscriberNumberRequestDto)
    @ApiPropertyOptional({type: SubscriberNumberRequestDto, nullable: true})
        primary_number?: SubscriberNumberRequestDto | null

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => SubscriberAliasNumberRequestDto)
    @ApiPropertyOptional({type: [SubscriberAliasNumberRequestDto]})
        alias_numbers?: SubscriberAliasNumberRequestDto[]

    @IsOptional()
    @IsString()
    @MaxLength(128)
    @ApiPropertyOptional({nullable: true})
        display_name?: string | null

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false, description: 'PBX customers only, can not be changed'})
        is_pbx_pilot?: boolean

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false, description: 'PBX customers only, can not be changed'})
        is_pbx_group?: boolean

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({nullable: true, description: 'PBX subscribers other than the pilot'})
        pbx_extension?: string | null

    @IsOptional()
    @IsEnum(SubscriberPbxHuntPolicy)
    @ApiPropertyOptional({enum: SubscriberPbxHuntPolicy, nullable: true, description: 'PBX groups only'})
        pbx_hunt_policy?: SubscriberPbxHuntPolicy | null

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiPropertyOptional({nullable: true, description: 'PBX groups only'})
        pbx_hunt_timeout?: number | null

    @IsOptional()
    @IsEnum(SubscriberPbxHuntCancelMode)
    @ApiPropertyOptional({enum: SubscriberPbxHuntCancelMode, nullable: true, description: 'PBX groups only'})
        pbx_hunt_cancel_mode?: SubscriberPbxHuntCancelMode | null

    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @ApiPropertyOptional({type: [Number], description: 'Groups of the subscriber, PBX subscribers other than groups and the pilot'})
        pbx_group_ids?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @ApiPropertyOptional({type: [Number], description: 'Members of the group in hunting order, PBX groups only'})
        pbx_groupmember_ids?: number[]

    constructor(entity?: internal.Subscriber) {
        if (!entity) return
        this.customer_id = entity.customerId
        this.username = entity.username
        this.domain = entity.domain
        this.domain_id = entity.domainId
        this.status = entity.status
        this.lock = entity.lock == null ? null : +entity.lock
        this.external_id = entity.externalId
        this.email = entity.email
        this.timezone = entity.timezone
        this.webusername = entity.webusername
        this.administrative = entity.administrative
        this.profile_set_id = entity.profileSetId
        this.profile_id = entity.profileId
        this.primary_number = entity.primaryNumber ? new SubscriberNumberRequestDto(entity.primaryNumber) : null
        this.alias_numbers = (entity.aliasNumbers ?? []).map(number => new SubscriberAliasNumberRequestDto(number))
        this.display_name = entity.displayName
        this.is_pbx_pilot = entity.isPbxPilot
        this.is_pbx_group = entity.isPbxGroup
        this.pbx_extension = entity.pbxExtension
        this.pbx_hunt_policy = entity.pbxHuntPolicy
        this.pbx_hunt_timeout = entity.pbxHuntTimeout
        this.pbx_hunt_cancel_mode = entity.pbxHuntCancelMode
        this.pbx_group_ids = entity.pbxGroupIds ? [...entity.pbxGroupIds] : []
        this.pbx_groupmember_ids = entity.pbxGroupmemberIds ? [...entity.pbxGroupmemberIds] : []
    }

    toInternal(options: RequestDtoOptions = {}): internal.Subscriber {
        const subscriber = new internal.Subscriber()
        if (options.id)
            subscriber.id = options.id
        subscriber.customerId = this.customer_id
        subscriber.username = this.username
        subscriber.domain = this.domain
        subscriber.domainId = this.domain_id
        subscriber.status = this.status
        subscriber.lock = this.lock === undefined ? undefined : lockValue(this.lock)
        subscriber.externalId = this.external_id === '' ? null : this.external_id
        subscriber.email = this.email
        subscriber.timezone = this.timezone
        subscriber.webusername = this.webusername
        subscriber.password = this.password
        subscriber.webpassword = this.webpassword
        subscriber.administrative = this.administrative
        subscriber.profileSetId = this.profile_set_id
        subscriber.profileId = this.profile_id
        subscriber.primaryNumber = this.primary_number === undefined || this.primary_number === null
            ? this.primary_number
            : Object.assign(new SubscriberNumberRequestDto(), this.primary_number).toInternal()
        subscriber.aliasNumbers = this.alias_numbers === null ? [] : this.alias_numbers?.map(number =>
            Object.assign(new SubscriberAliasNumberRequestDto(), number).toInternal(),
        )
        subscriber.displayName = this.display_name
        subscriber.isPbxPilot = this.is_pbx_pilot
        subscriber.isPbxGroup = this.is_pbx_group
        subscriber.pbxExtension = this.pbx_extension
        subscriber.pbxHuntPolicy = this.pbx_hunt_policy
        subscriber.pbxHuntTimeout = this.pbx_hunt_timeout
        subscriber.pbxHuntCancelMode = this.pbx_hunt_cancel_mode
        subscriber.pbxGroupIds = this.pbx_group_ids === null ? [] : this.pbx_group_ids
        subscriber.pbxGroupmemberIds = this.pbx_groupmember_ids === null ? [] : this.pbx_groupmember_ids
        return subscriber
    }
}

function lockValue(lock: number | string | null): string | null {
    return lock == null || +lock == 0 ? null : `${+lock}`
}

export const subscriberRequestFields: (keyof internal.Subscriber)[] = [
    'customerId',
    'username',
    'domain',
    'domainId',
    'status',
    'lock',
    'externalId',
    'email',
    'timezone',
    'webusername',
    'administrative',
    'profileSetId',
    'profileId',
    'primaryNumber',
    'aliasNumbers',
    'displayName',
    'isPbxPilot',
    'isPbxGroup',
    'pbxExtension',
    'pbxHuntPolicy',
    'pbxHuntTimeout',
    'pbxHuntCancelMode',
    'pbxGroupIds',
    'pbxGroupmemberIds',
]
