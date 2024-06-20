import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {ResponseDto} from '../../../dto/response.dto'

export class HeaderManipulationResponseDto implements ResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        links: string[]

    constructor(prefix: string) {
        const url = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
        this.links = [
            url + '/sets',
            url + '/sets/rules',
            url + '/sets/rules/actions',
            url + '/sets/rules/conditions',
        ]
    }
}