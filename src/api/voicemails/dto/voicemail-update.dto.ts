import {ApiProperty} from '@nestjs/swagger'
import {internal} from '../../../entities'

export class VoicemailUpdateDto {
    @ApiProperty({description: 'the folder the message is currently in', example: '/INBOX'})
        folder: string

    toInternal(id?: number): internal.Voicemail {
        const voicemail = new internal.Voicemail()

        voicemail.dir = this.folder

        if (id)
            voicemail.id = id

        return voicemail
    }
}
