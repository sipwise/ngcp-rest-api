import {ApiProperty} from '@nestjs/swagger'
import {RequestDto, RequestDtoOptions} from '../../../dto/request.dto'
import {internal} from '../../../entities'

export class VoicemailRequestDto implements RequestDto {
    @ApiProperty({description: 'message folder', example: ['Old', 'Inbox']})
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

        if (options.assignNulls) {
            Object.keys(voicemail).forEach(k => {
                if (voicemail[k] === undefined)
                    voicemail[k] = null
            })
        }
        return voicemail
    }
}
