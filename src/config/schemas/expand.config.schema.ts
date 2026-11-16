import {IsInt, IsOptional, Min} from 'class-validator'

export class ExpandConfig {
    // most ids a nested filter (contract_id.contact_id.email=...) may resolve to
    @IsOptional()
    @IsInt()
    @Min(1)
        filter_max_ids?: number
}
