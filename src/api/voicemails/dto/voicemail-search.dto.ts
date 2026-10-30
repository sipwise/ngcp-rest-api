import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {VoicemailResponseDto} from './voicemail-response.dto'

export class VoicemailSearchDto implements VoicemailResponseDto {
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        call_id: string
    @ApiPropertyOptional()
        caller: string
    @ApiPropertyOptional()
        duration: string
    @ApiPropertyOptional()
        folder: string
    @ApiPropertyOptional()
        time: string
    @ApiPropertyOptional()
        subscriber_id: number
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
