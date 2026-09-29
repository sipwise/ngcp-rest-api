import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class DomainSearchDto {
    @ApiPropertyOptional()
        domain: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'domain.id',
    }
}
