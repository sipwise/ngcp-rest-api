import {ApiHideProperty, ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty} from 'class-validator'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {internal} from '../../../entities'
import {ContractResponseDto} from '../../contracts/dto/contract-response.dto'
import {ResponseDto} from '../../../dto/response.dto'

export class ResellerResponseDto implements ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
    @IsNotEmpty()
        contract_id: number

    @ApiHideProperty()
        contract_id_expand: ContractResponseDto

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
