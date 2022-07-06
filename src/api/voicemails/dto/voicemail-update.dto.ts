import {ApiProperty} from '@nestjs/swagger'

export class VoicemailUpdateDto {
    @ApiProperty({description: 'the folder the message is currently in', example: '/INBOX'})
        folder: string
}
