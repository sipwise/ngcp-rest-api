import {ApiProperty} from '@nestjs/swagger'
import {Matches} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {supportedVoicemailFolders, voicemailSpoolDir} from '~/enums/supported-voicemail-folders.enum'

export class VoicemailRequestDto implements RequestDto {
    @Matches(new RegExp(`^${voicemailSpoolDir}`), {message: 'dir value must have full path'})
    @ApiProperty({
        description: `message folder full path, the last path segment is one of: ${supportedVoicemailFolders.join(', ')}`,
        example: `${voicemailSpoolDir}31a16db6-e160-4a94-b7ff-bd4d1480c6b1/Old`,
    })
        folder: string

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
