import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'

interface CustomerSpeedDialResponseDtoAttributes {
    id: number
    customer_id: number
    slot: string
    destination: string
}

export class CustomerSpeedDialResponseDto implements CustomerSpeedDialResponseDtoAttributes {
    @ApiProperty()
        id: number
    @ApiProperty()
        customer_id: number
    @ApiProperty()
        slot: string
    @ApiProperty()
        destination: string

    constructor(csd: internal.CustomerSpeedDial) {
        this.id = csd.id
        this.customer_id = csd.contract_id
        this.slot = csd.slot
        this.destination = csd.destination
    }
}

