import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class DomainSearchDto {
    @ApiPropertyOptional()
        domain: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'domain.id',
        }
}
