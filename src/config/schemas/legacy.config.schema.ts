import {IsBoolean} from 'class-validator'

export class LegacyConfig {
    @IsBoolean()
        errors: boolean
}