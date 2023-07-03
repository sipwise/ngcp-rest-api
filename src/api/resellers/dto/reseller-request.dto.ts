import {IsEnum, IsNotEmpty} from 'class-validator'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {ApiProperty} from '@nestjs/swagger'
import {RequestDto} from '../../../dto/request.dto'
import {internal} from '../../../entities'

export class ResellerRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty()
        contract_id: number

    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsNotEmpty()
    @IsEnum(ResellerStatus)
    @ApiProperty()
        status: ResellerStatus

    toInternal(id?: number): internal.Reseller {
        const reseller = new internal.Reseller()

        reseller.contract_id = this.contract_id
        reseller.name = this.name
        reseller.status = this.status

        if (id)
            reseller.id = id

        return reseller
    }
}
