import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty} from 'class-validator'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {internal} from '../../../entities'

export class ResellerResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
    @IsNotEmpty()
        contract_id: number

    @ApiProperty()
        name: string

    @ApiProperty()
    @IsEnum(ResellerStatus)
        status: ResellerStatus

    constructor(reseller: internal.Reseller) {
        this.id = reseller.id
        this.contract_id = reseller.contract_id
        this.name = reseller.name
        this.status = reseller.status
    }
}
