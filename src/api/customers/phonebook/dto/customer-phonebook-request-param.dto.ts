import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

export class CustomerPhonebookRequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        customerId?: number
}