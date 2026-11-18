import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class VoicemailResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the voicemail'})
        id: number

    @IsString()
    @ApiProperty({description: 'Call-ID of the recorded call'})
        call_id: string

    @IsString()
    @ApiProperty({description: 'Caller number'})
        caller: string

    @IsString()
    @ApiProperty({description: 'Recording time as `Nov 18 2026 10:15:00`, in the server time zone'})
        time: string

    @IsString()
    @ApiProperty({description: 'Duration in seconds'})
        duration: string

    @IsString()
    @ApiProperty({description: 'Mailbox folder of the message', example: ['Inbox', 'Old']})
        folder: string

    @IsInt()
    @ApiProperty({description: 'Subscriber owning the message'})
        subscriber_id: number

    constructor(voicemail: internal.Voicemail, options?: ResponseDtoOptions) {
        super(options)
        const date = new Date(parseInt(voicemail.origtime) * 1000)

        this.id = voicemail.id
        this.call_id = voicemail.call_id
        this.caller = voicemail.callerid
        this.duration = voicemail.duration
        this.folder = voicemail.dir.substring(voicemail.dir.lastIndexOf('/') + 1)
        this.subscriber_id = voicemail.subscriber_id
        this.time = date.toString().split(' ').slice(1, 5).join(' ')
    }
}
