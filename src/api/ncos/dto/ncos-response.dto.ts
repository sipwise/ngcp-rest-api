import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'

export class NCOSResponseDto {
    @IsNotEmpty()
    @ApiProperty()
        links: string[]

    constructor(prefix: string) {
        this.links = [
            prefix + '/sets',
            prefix + '/sets/levels'
        ]
    }
}