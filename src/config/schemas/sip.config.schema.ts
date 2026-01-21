import {IsArray} from 'class-validator'

export class SipConfig {
    @IsArray()
        external_sbc: string[]
}