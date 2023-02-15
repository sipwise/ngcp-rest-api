import {ApiProperty} from '@nestjs/swagger'

export class CreateResponseDto<TData> {
    @ApiProperty()
        total_count: number

    @ApiProperty()
        data?: TData[]

    @ApiProperty()
        links?: string[]

    @ApiProperty()
        ids?: string[]
}