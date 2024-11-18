import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, ValidateNested} from 'class-validator'

export class PbxResponseDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => String)
    @ApiProperty()
        links: string[]

    constructor(prefix: string) {
        const url = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
        this.links = [
            url + '/groups',
            url + '/groups/members',
        ]
    }
}
