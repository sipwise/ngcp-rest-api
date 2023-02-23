import {IsEnum, IsNotEmpty} from 'class-validator'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {ApiProperty} from '@nestjs/swagger'
import {internal} from '../../../entities'

export class ResellerCreateDto {
    @ApiProperty()
    @IsNotEmpty()
        contract_id: number

    @ApiProperty()
        name: string

    @ApiProperty()
    @IsEnum(ResellerStatus)
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
