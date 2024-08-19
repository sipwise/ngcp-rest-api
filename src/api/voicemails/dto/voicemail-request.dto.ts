import {ApiProperty} from '@nestjs/swagger'
import {RequestDto, RequestDtoOptions} from '../../../dto/request.dto'
import {internal} from '../../../entities'

export class VoicemailRequestDto implements RequestDto {
    @ApiProperty({description: 'message folder', example: ['Old', 'Inbox']})
        folder: string

    toInternal(options: RequestDtoOptions = {}): internal.Voicemail {
        const voicemail = new internal.Voicemail()

        voicemail.dir = this.folder

        if (options.id)
            voicemail.id = options.id

        return voicemail
    }
}
