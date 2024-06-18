import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

export class RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        id?: number
}