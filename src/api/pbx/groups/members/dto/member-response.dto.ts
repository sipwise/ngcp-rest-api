import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PbxGroupMemberResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the PBX group member'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Id of the PBX group'})
        group_id: number

    @IsNotEmpty()
    @IsString()
    @ApiProperty({description: 'Extension of the member'})
        extension: string

    @IsInt()
    @ApiProperty({description: 'Subscriber of the member'})
        subscriber_id: number

    @IsNotEmpty()
    @IsString()
    @ApiProperty({description: 'SIP username of the member'})
        username: string

    @IsNotEmpty()
    @IsString()
    @ApiProperty({description: 'Domain of the member'})
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
