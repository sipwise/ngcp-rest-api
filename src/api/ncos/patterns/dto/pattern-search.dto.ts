import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSPatternSearchDto {
    @ApiPropertyOptional()
        ncos_level_id: number
    @ApiPropertyOptional()
        pattern: string
    @ApiPropertyOptional()
        description: string
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
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
