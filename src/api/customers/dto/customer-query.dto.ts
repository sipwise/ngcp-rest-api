import {IsBooleanString, IsOptional} from 'class-validator'

export class CustomerQueryDto {
    @IsOptional()
    @IsBooleanString()
        include_terminated?: string
}