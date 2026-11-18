import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSPatternSearchDto {
    @ApiPropertyOptional({description: 'NCOS level of the pattern'})
        ncos_level_id: number
    @ApiPropertyOptional({description: 'PCRE regex matched against the called number'})
        pattern: string
    @ApiPropertyOptional({description: 'Description of the pattern'})
        description: string
    @ApiPropertyOptional({description: 'Reseller of the NCOS level'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Id of the NCOS pattern'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'pattern.id',
            ncos_level_id: 'pattern.ncos_level_id',
            pattern: 'pattern.pattern',
            description: 'pattern.description',
            reseller_id: 'pattern.level.reseller_id',
        }
}
