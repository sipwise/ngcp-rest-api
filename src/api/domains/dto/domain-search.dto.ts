import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class DomainSearchDto {
    @ApiPropertyOptional({description: 'Fully qualified domain name'})
        domain: string
    @ApiPropertyOptional({description: 'Reseller of the domain; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Id of the domain'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'domain.id',
        }
}
