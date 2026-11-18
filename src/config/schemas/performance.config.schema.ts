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

    // most rows a client may request per page (GET `rows`)
    @IsOptional()
    @IsInt()
    @Min(1)
        read_limit?: number

    // most items of one bulk request (POST array, PUT/PATCH by id, DELETE ids, CSV rows)
    @IsOptional()
    @IsInt()
    @Min(1)
        write_limit?: number

    // largest JSON or CSV request body
    @IsOptional()
    @Matches(SIZE_PATTERN)
        body_limit?: string
}
