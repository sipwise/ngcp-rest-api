import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class PbxGroupMemberResponseDto implements ResponseDto {
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

    constructor(member: internal.PbxGroupMember) {
        this.id = member.id
        this.group_id = member.groupId
        this.extension = member.extension
        this.subscriber_id = member.subscriberId
        this.username = member.username
        this.domain = member.domain
    }
}
