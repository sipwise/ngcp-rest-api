import {ApiProperty} from '@nestjs/swagger'
import {IsIn} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {supportedVoicemailFolders} from '~/enums/supported-voicemail-folders.enum'

export class VoicemailRequestDto implements RequestDto {
    @IsIn(supportedVoicemailFolders)
    @ApiProperty({description: 'message folder', enum: supportedVoicemailFolders, example: 'Old'})
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
