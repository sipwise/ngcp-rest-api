import {ApiProperty} from '@nestjs/swagger'
import {IsIn} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {supportedVoicemailFolders} from '~/enums/supported-voicemail-folders.enum'
import {DtoFields, withDtoFields} from '~/helpers/dto-fields.helper'

export class VoicemailRequestDto implements RequestDto {
    static readonly dtoFields: DtoFields<internal.Voicemail, VoicemailRequestDto> = {dir: 'folder'}

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
        return withDtoFields(voicemail, VoicemailRequestDto.dtoFields)
    }
}
