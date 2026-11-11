import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {
    SubscriberAliasNumber,
    SubscriberNumber,
    SubscriberPbxHuntCancelMode,
    SubscriberPbxHuntPolicy,
} from '~/entities/internal/subscriber.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class SubscriberNumberResponseDto {
    @ApiProperty({example: 43})
        cc: number

    @ApiProperty({example: '1'})
        ac: string

    @ApiProperty({example: '9999'})
        sn: string

    @ApiProperty()
        number_id: number

    constructor(number: SubscriberNumber) {
        this.cc = number.cc
        this.ac = number.ac
        this.sn = number.sn
        this.number_id = number.numberId
    }
}

export class SubscriberAliasNumberResponseDto extends SubscriberNumberResponseDto {
    @ApiProperty({description: 'Device id alias'})
        is_devid: boolean

    constructor(number: SubscriberAliasNumber) {
        super(number)
        this.is_devid = number.isDevId
    }
}

const subscriberRoles: string[] = [
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
]

export class SubscriberResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'Admin roles only'})
        uuid?: string

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({description: 'Not shown to subscriber'})
    @Expandable({name: 'customer_id', controller: 'contractController'})
        customer_id?: number

    @IsString()
    @ApiProperty()
        username: string

    @IsString()
    @ApiProperty()
        domain: string

    @IsInt()
    @ApiProperty()
        domain_id: number

    @IsEnum(VoipSubscriberStatus)
    @ApiProperty({enum: [VoipSubscriberStatus.Active, VoipSubscriberStatus.Locked]})
        status: VoipSubscriberStatus

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({nullable: true, description: 'Lock level, admin roles only'})
        lock?: string | null

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({nullable: true, description: 'Admin roles only'})
        external_id?: string | null

    @CanBeNull()
    @IsString()
    @ApiProperty({nullable: true})
        email: string | null

    @CanBeNull()
    @IsString()
    @ApiProperty({nullable: true})
        timezone: string | null

    @CanBeNull()
    @IsString()
    @ApiProperty({nullable: true})
        webusername: string | null

    @IsBoolean()
    @ApiProperty()
        administrative: boolean

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true, description: 'Admin roles only'})
        profile_set_id?: number | null

    @CanBeNull()
    @IsInt()
    @ApiProperty({nullable: true})
        profile_id: number | null

    @ApiProperty({type: SubscriberNumberResponseDto, nullable: true})
        primary_number: SubscriberNumberResponseDto | null

    @IsArray()
    @ApiProperty({type: [SubscriberAliasNumberResponseDto]})
        alias_numbers: SubscriberAliasNumberResponseDto[]

    @CanBeNull()
    @IsString()
    @ApiProperty({nullable: true})
        display_name: string | null

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'PBX customers only'})
        is_pbx_pilot?: boolean

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'PBX customers only'})
        is_pbx_group?: boolean

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({nullable: true, description: 'PBX customers only'})
        pbx_extension?: string | null

    @IsOptional()
    @IsEnum(SubscriberPbxHuntPolicy)
    @ApiPropertyOptional({enum: SubscriberPbxHuntPolicy, nullable: true, description: 'PBX groups only'})
        pbx_hunt_policy?: SubscriberPbxHuntPolicy | null

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true, description: 'PBX groups only'})
        pbx_hunt_timeout?: number | null

    @IsOptional()
    @IsEnum(SubscriberPbxHuntCancelMode)
    @ApiPropertyOptional({enum: SubscriberPbxHuntCancelMode, nullable: true, description: 'PBX groups only'})
        pbx_hunt_cancel_mode?: SubscriberPbxHuntCancelMode | null

    @IsOptional()
    @IsArray()
    @ApiPropertyOptional({type: [Number], description: 'Groups of the subscriber, PBX subscribers other than groups only'})
        pbx_group_ids?: number[]

    @IsOptional()
    @IsArray()
    @ApiPropertyOptional({type: [Number], description: 'Members of the group, PBX groups only'})
        pbx_groupmember_ids?: number[]

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true, description: 'Extension range of the customer, administrative PBX subscribers only'})
        ext_range_min?: number | null

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({nullable: true, description: 'Extension range of the customer, administrative PBX subscribers only'})
        ext_range_max?: number | null

    @IsOptional()
    @IsDate()
    @ApiPropertyOptional({description: 'Admin roles only'})
        create_timestamp?: Date

    @IsOptional()
    @IsDate()
    @ApiPropertyOptional({description: 'Admin roles only'})
        modify_timestamp?: Date

    /**
     * @param role role of the caller, fields it may not see are left out
     */
    constructor(entity: internal.Subscriber, role: string, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        const adminView = !subscriberRoles.includes(role)
        this.id = entity.id
        if (adminView)
            this.uuid = entity.uuid
        if (role != RbacRole.subscriber)
            this.customer_id = entity.customerId
        this.username = entity.username
        this.domain = entity.domain
        this.domain_id = entity.domainId
        this.status = entity.status
        if (adminView) {
            this.lock = entity.lock
            this.external_id = entity.externalId
        }
        this.email = entity.email
        this.timezone = entity.timezone
        this.webusername = entity.webusername
        this.administrative = entity.administrative
        if (adminView)
            this.profile_set_id = entity.profileSetId
        this.profile_id = entity.profileId
        this.primary_number = entity.primaryNumber ? new SubscriberNumberResponseDto(entity.primaryNumber) : null
        this.alias_numbers = entity.aliasNumbers.map(number => new SubscriberAliasNumberResponseDto(number))
        this.display_name = entity.displayName
        if (entity.isPbxAccount) {
            this.is_pbx_pilot = entity.isPbxPilot
            this.is_pbx_group = entity.isPbxGroup
            this.pbx_extension = entity.pbxExtension
            if (entity.isPbxGroup) {
                this.pbx_hunt_policy = entity.pbxHuntPolicy
                this.pbx_hunt_timeout = entity.pbxHuntTimeout
                this.pbx_hunt_cancel_mode = entity.pbxHuntCancelMode
                this.pbx_groupmember_ids = entity.pbxGroupmemberIds
            } else {
                this.pbx_group_ids = entity.pbxGroupIds
            }
            if (entity.administrative) {
                this.ext_range_min = entity.extRangeMin
                this.ext_range_max = entity.extRangeMax
            }
        }
        if (adminView) {
            this.create_timestamp = entity.createTimestamp
            this.modify_timestamp = entity.modifyTimestamp
        }
    }
}
