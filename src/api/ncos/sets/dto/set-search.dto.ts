import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSSetSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the NCOS set'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Name of the NCOS set'})
        name: string
    @ApiPropertyOptional({description: 'Customers can see and use the set in their preferences'})
        expose_to_customer: boolean
    @ApiPropertyOptional({description: 'Id of the NCOS set'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'ncosSet.id',
        }
}
