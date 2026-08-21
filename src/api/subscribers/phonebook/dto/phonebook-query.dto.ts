import {IsEnum, IsOptional} from 'class-validator'

export enum SubscriberPhonebookView {
    All = 'all',
    Customer = 'customer',
    Reseller = 'reseller',
}

export class SubscriberPhonebookQueryDto {
    @IsOptional()
    @IsEnum(SubscriberPhonebookView)
        include?: SubscriberPhonebookView
}