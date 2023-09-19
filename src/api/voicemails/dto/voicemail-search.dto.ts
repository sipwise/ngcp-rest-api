import {VoicemailResponseDto} from './voicemail-response.dto'

export class VoicemailSearchDto implements VoicemailResponseDto {
    id: number = undefined
    call_id: string = undefined
    caller: string = undefined
    duration: string = undefined
    folder: string = undefined
    time: string = undefined
    subscriber_id: number = undefined
}
