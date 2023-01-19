import {ApiProperty} from '@nestjs/swagger'

export class PaginatedDto<TData> {
    @ApiProperty()
        total_count: number

    @ApiProperty()
        data: TData[]
}