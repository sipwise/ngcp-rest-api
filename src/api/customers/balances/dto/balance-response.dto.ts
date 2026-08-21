import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNumber} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBalanceResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id!: number

    @IsNumber()
    @ApiProperty()
        cash_balance: number

    @IsNumber()
    @ApiProperty()
        cash_debit: number

    @IsNumber()
    @ApiProperty()
        free_time_balance: number

    @IsNumber()
    @ApiProperty()
        free_time_spent: number

    @IsNumber()
    @ApiProperty()
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
