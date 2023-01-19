import {ApiProperty} from '@nestjs/swagger'

export class CreatedDto<TData> {
    @ApiProperty()
        total_count: number

    @ApiProperty()
        data?: TData[]

    @ApiProperty()
        links?: string[]

    @ApiProperty()
        ids?: string[]
}