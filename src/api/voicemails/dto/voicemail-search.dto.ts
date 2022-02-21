import {VoicemailResponseDto} from './voicemail-response.dto'

export class VoicemailSearchDto implements VoicemailResponseDto {
    id: number = undefined
    folder: string = undefined
    caller: string = undefined
    time: string = undefined
    duration: string = undefined
    subscriber_id: number = undefined
}
