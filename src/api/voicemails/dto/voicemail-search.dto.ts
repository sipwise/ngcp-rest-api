import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {VoicemailResponseDto} from './voicemail-response.dto'

export class VoicemailSearchDto implements VoicemailResponseDto {
    @ApiPropertyOptional({description: 'Id of the voicemail'})
        id: number
    @ApiPropertyOptional({description: 'Call-ID of the recorded call'})
        call_id: string
    @ApiPropertyOptional({description: 'Caller number'})
        caller: string
    @ApiPropertyOptional({description: 'Duration in seconds'})
        duration: string
    @ApiPropertyOptional({description: 'Mailbox folder of the message'})
        folder: string
    @ApiPropertyOptional({description: 'Recording time, Unix timestamp in seconds'})
        time: string
    @ApiPropertyOptional({description: 'Subscriber owning the message'})
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
