import {Type} from 'class-transformer'
import {IsInt, IsOptional, Matches, Min, ValidateNested} from 'class-validator'

// body-parser size syntax, e.g. 20mb
export const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i

export class LazyLoadConfig {
    // most items of a lazy field a response may inline; also the threshold of inline=auto
    @IsOptional()
    @IsInt()
    @Min(1)
        inline_max_items?: number

    // most items all lazy fields of one response may inline together, across its rows and expanded objects
    @IsOptional()
    @IsInt()
    @Min(1)
        inline_max_hard_limit?: number
}

export class PerformanceConfig {
    @IsOptional()
    @ValidateNested()
    @Type(() => LazyLoadConfig)
        lazy_load?: LazyLoadConfig

    // most rows a client may request per page of a JSON collection (GET `rows`)
    @IsOptional()
    @IsInt()
    @Min(1)
        read_rows_limit?: number

    // most items of one bulk request (POST array, PUT/PATCH by id, DELETE ids, CSV rows)
    @IsOptional()
    @IsInt()
    @Min(1)
        write_items_limit?: number

    // largest JSON request body
    @IsOptional()
    @Matches(SIZE_PATTERN)
        write_body_limit?: string

    // largest uploaded file (multipart: CSV, iCalendar, invoice templates)
    @IsOptional()
    @Matches(SIZE_PATTERN)
        write_file_limit?: string

    // largest CSV export
    @IsOptional()
    @Matches(SIZE_PATTERN)
        read_file_limit?: string
}
