import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNumber} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBalanceResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the customer balance'})
        id!: number

    @IsNumber()
    @ApiProperty({description: 'Current cash balance in currency units'})
        cash_balance: number

    @IsNumber()
    @ApiProperty({description: 'Amount spent in the current balance interval, in currency units'})
        cash_debit: number

    @IsNumber()
    @ApiProperty({description: 'Free time left in the current balance interval, in seconds'})
        free_time_balance: number

    @IsNumber()
    @ApiProperty({description: 'Free time spent in the current balance interval, in seconds'})
        free_time_spent: number

    @IsNumber()
    @ApiProperty({description: 'Share of the first balance interval the customer existed in; reduces its free cash and time'})
        ratio: number

    constructor(entity: internal.ContractBalance, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.cash_balance = entity.cashBalance
        this.cash_debit = entity.debit
        this.free_time_balance = entity.freeTimeBalance
        this.free_time_spent = entity.freeTimeBalanceInterval
        this.ratio = entity.ratio
    }
}
