import {IsBoolean} from 'class-validator'

export class NumberManagementConfig {
    @IsBoolean()
        auto_allow_cli: boolean

    @IsBoolean()
        auto_sync_cli: boolean
}
