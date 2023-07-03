import {ApiProperty} from '@nestjs/swagger'
import {RequestDto, RequestDtoOptions} from '../../../dto/request.dto'
import {internal} from '../../../entities'

export class VoicemailRequestDto implements RequestDto {
    @ApiProperty({description: 'the folder the message is currently in', example: '/INBOX'})
        folder: string

    constructor(entity?: internal.Voicemail) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(options: RequestDtoOptions = {}): internal.Voicemail {
        const voicemail = new internal.Voicemail()

        voicemail.dir = this.folder

        if (options.id)
            voicemail.id = options.id

        return voicemail
    }
}
