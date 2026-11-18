import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerSpeedDialSearchDto {
    @ApiPropertyOptional({description: 'Customer owning the speed dial'})
        customer_id: number
    @ApiPropertyOptional({description: 'Speed dial slot'})
        slot: string
    @ApiPropertyOptional({description: 'Speed dial destination'})
        destination: string
    @ApiPropertyOptional({description: 'Id of the customer speed dial'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'csd.id',
            customer_id: 'contract_id',
        }
}
