import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerSpeedDialSearchDto {
    @ApiPropertyOptional()
        customer_id: number
    @ApiPropertyOptional()
        slot: string
    @ApiPropertyOptional()
        destination: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'csd.id',
            customer_id: 'contract_id',
        }
}
