import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNumber, IsPositive} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class CustomerBalanceRequestDto implements RequestDto {
    @ApiProperty()
    @IsPositive()
    @IsInt()
        cash_balance!: number

    @ApiProperty()
    @IsNumber()
        cash_debit!: number

    @ApiPropertyOptional()
    @IsNumber()
        free_time_balance?: number

    @ApiPropertyOptional()
    @IsNumber()
        free_time_spent?: number

    constructor(entity?: internal.ContractBalance) {
        if (!entity)
            return
        this.cash_balance = entity.cashBalance
        this.cash_debit = entity.debit
        this.free_time_balance = entity.freeTimeBalance
        this.free_time_spent = entity.freeTimeBalanceInterval
    }

    toInternal(options: RequestDtoOptions = {}): internal.ContractBalance {
        const entity = new internal.ContractBalance()
        entity.cashBalance = this.cash_balance
        entity.debit = this.cash_debit
        entity.freeTimeBalance = this.free_time_balance
        entity.freeTimeBalanceInterval = this.free_time_spent

        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
