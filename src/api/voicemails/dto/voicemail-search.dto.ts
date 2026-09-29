import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {VoicemailResponseDto} from './voicemail-response.dto'

export class VoicemailSearchDto implements VoicemailResponseDto {
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        call_id: string = undefined
    @ApiPropertyOptional()
        caller: string = undefined
    @ApiPropertyOptional()
        duration: string = undefined
    @ApiPropertyOptional()
        folder: string = undefined
    @ApiPropertyOptional()
        time: string = undefined
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'voicemail.id',
        subscriber_id: 'bSubscriber.id',
        caller: 'callerid',
        folder: {
            field: 'dir',
            comparator: 'like',
            transform: 'lower',
            format: (args: string[]): string => `/var/spool/asterisk/voicemail/default/%/${args[0]}`,
        },
        time: 'origtime',
    }
}
