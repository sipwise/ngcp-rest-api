import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PbxGroupMemberResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        group_id: number

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
        extension: string

    @IsInt()
    @ApiProperty()
        subscriber_id: number

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
        username: string

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
        domain: string

    constructor(member: internal.PbxGroupMember, options?: ResponseDtoOptions) {
        super(options)
        this.id = member.id
        this.group_id = member.groupId
        this.extension = member.extension
        this.subscriber_id = member.subscriberId
        this.username = member.username
        this.domain = member.domain
    }
}
