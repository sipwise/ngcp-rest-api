import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class PbxResponseDto {
    @IsNotEmpty()
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
