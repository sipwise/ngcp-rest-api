import {ApiProperty} from '@nestjs/swagger'
import {ResponseDto} from '../../../dto/response.dto'
import {internal} from '../../../entities'

export class VoicemailResponseDto implements ResponseDto {
    @ApiProperty({description: 'unique identifier of a voicemail'})
        id: number

    @ApiProperty({description: 'caller number'})
        caller: string

    @ApiProperty({description: 'time of the message (timestamp)'})
        time: string

    @ApiProperty({description: 'duration of the message in seconds'})
        duration: string

    @ApiProperty({description: 'the folder the message is currently in', example: '/INBOX'})
        folder: string

    @ApiProperty({description: 'the subscriber id the message belongs to'})
        subscriber_id: number

    constructor(voicemail: internal.Voicemail) {
        const date = new Date(parseInt(voicemail.origtime) * 1000)

        this.id = voicemail.id
        this.caller = voicemail.callerid
        this.duration = voicemail.duration
        this.folder = voicemail.dir.substring(voicemail.dir.lastIndexOf('/') + 1)
        this.subscriber_id = voicemail.subscriber_id
        this.time = date.toString().split(' ').slice(1, 5).join(' ')
    }
}
