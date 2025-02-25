import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsString} from 'class-validator'

export class PrimaryNumber {
    @IsInt()
    @ApiProperty()
        number_id: number

    @IsInt()
    @ApiProperty()
        cc: number

    @IsInt()
    @ApiProperty()
        ac: number

    @IsString()
    @ApiProperty()
        sn: string
}