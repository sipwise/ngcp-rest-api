import {VoicemailsResponseDto} from './voicemails-response.dto'

export class VoicemailSearchDto implements VoicemailsResponseDto {
    id: number = undefined
    folder: string = undefined
    caller: string = undefined
    time: string = undefined
    duration: string = undefined
    subscriber_id: number = undefined
}
