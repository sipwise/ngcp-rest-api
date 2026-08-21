import {IsEnum, IsOptional} from 'class-validator'

export enum CustomerPhonebookView {
    All = 'all',
    Shared = 'shared',
    Reseller = 'reseller',
}

export class CustomerPhonebookQueryDto {
    @IsOptional()
    @IsEnum(CustomerPhonebookView)
        include?: CustomerPhonebookView
}