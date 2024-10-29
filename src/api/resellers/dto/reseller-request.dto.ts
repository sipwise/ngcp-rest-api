import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'

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

    constructor(entity?: internal.Reseller) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(options: RequestDtoOptions = {}): internal.Reseller {
        const reseller = new internal.Reseller()

        reseller.contract_id = this.contract_id
        reseller.name = this.name
        reseller.status = this.status

        if (options.id)
            reseller.id = options.id

        if (options.assignNulls) {
            Object.keys(reseller).forEach(k => {
                if (reseller[k] === undefined)
                    reseller[k] = null
            })
        }
        return reseller
    }
}
