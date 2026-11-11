import {Type} from 'class-transformer'
import {IsArray, IsString, ValidateNested} from 'class-validator'

class SubscriberadminPrivilegesConfig {
    @IsArray()
    @IsString({each: true})
        subscribers: string[]
}

export class PrivilegesConfig {
    @ValidateNested()
    @Type(() => SubscriberadminPrivilegesConfig)
        subscriberadmin: SubscriberadminPrivilegesConfig
}
