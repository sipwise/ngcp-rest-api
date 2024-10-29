import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class PbxGroupMemberResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        id: number

    @IsNotEmpty()
    @ApiProperty()
        group_id: number

    @IsNotEmpty()
    @ApiProperty()
        extension: string

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
        subscriber_id: number

    @IsNotEmpty()
    @ApiProperty()
        username: string

    @IsNotEmpty()
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
