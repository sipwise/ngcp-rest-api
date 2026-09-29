import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class CustomerSpeedDialSearchDto {
    @ApiPropertyOptional()
        customer_id: number = undefined
    @ApiPropertyOptional()
        slot: string = undefined
    @ApiPropertyOptional()
        destination: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'csd.id',
        customer_id: 'contract_id',
    }
}
