import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsString} from 'class-validator'

export class PrimaryNumber {
    @IsInt()
    @ApiProperty({description: 'Id of the number'})
        number_id: number

    @IsInt()
    @ApiProperty({description: 'Country code'})
        cc: number

    @IsInt()
    @ApiProperty({description: 'Area code, may be empty'})
        ac: number

    @IsString()
    @ApiProperty({description: 'Subscriber number'})
        sn: string
}