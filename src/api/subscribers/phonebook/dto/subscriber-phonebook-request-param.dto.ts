import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'

export class SubscriberPhonebookRequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        subscriberId?: number
}