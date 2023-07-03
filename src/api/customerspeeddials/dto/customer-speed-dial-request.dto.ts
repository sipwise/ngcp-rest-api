import {internal} from '../../../entities'
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'
import {RequestDto, RequestDtoOptions} from '../../../dto/request.dto'

export class CustomerSpeedDialRequestDto implements RequestDto {
    @IsNotEmpty()
    @IsNumber()
    @ApiPropertyOptional({description: 'Customer id', example: 1})
        customer_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial slot', example: '*0'})
        slot: string

    @IsNotEmpty()
    @ApiProperty({description: 'Speed dial destination', example: 'sip:4310001@exampledomain.org'})
        destination: string

    constructor(entity?: internal.CustomerSpeedDial) {
        if (!entity)
            return

        this.customer_id = entity.contractId
        this.slot = entity.slot
        this.destination = entity.destination
    }

    toInternal(options: RequestDtoOptions = {}): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.contractId = this.customer_id
        csd.slot = this.slot
        csd.destination = this.destination
        if (options.id)
            csd.id = options.id
        return csd
    }
}
