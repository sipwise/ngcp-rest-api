import {ApiProperty} from '@nestjs/swagger'
import {IsArray, IsNotEmpty} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'

export class RewriteRuleResponseDto implements ResponseDto {
    @IsNotEmpty()
    @IsArray()
    @ApiProperty()
        links: string[]

    constructor(prefix: string) {
        const url = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
        this.links = [
            url + '/sets',
            url + '/sets/rules',
        ]
    }
}