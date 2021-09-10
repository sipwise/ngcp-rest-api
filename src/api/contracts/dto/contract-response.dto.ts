import {ContractBaseDto} from './contract-base.dto'
import {ApiProperty} from '@nestjs/swagger'

export class ContractResponseDto extends ContractBaseDto {
    @ApiProperty({description: 'Unique identifier of the contract'})
    id: number
}
