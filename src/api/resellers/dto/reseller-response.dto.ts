import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty} from 'class-validator'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {internal} from '../../../entities'
import {ResponseDto} from '../../../dto/response.dto'
import {Expandable} from 'decorators/expandable.decorator'

export class ResellerResponseDto implements ResponseDto {
    @ApiProperty()
        id: number

    @ApiProperty()
    @IsNotEmpty()
    @Expandable({name: 'contract_id', controller: 'contractController'})
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
