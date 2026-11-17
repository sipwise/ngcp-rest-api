import {Type} from 'class-transformer'
import {IsInt, IsOptional, Min, ValidateNested} from 'class-validator'

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
}
