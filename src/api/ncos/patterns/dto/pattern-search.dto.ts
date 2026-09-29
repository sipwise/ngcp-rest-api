import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NCOSPatternSearchDto {
    @ApiPropertyOptional()
        ncos_level_id: number = undefined
    @ApiPropertyOptional()
        pattern: string = undefined
    @ApiPropertyOptional()
        description: string = undefined
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'pattern.id',
        ncos_level_id: 'pattern.ncos_level_id',
        pattern: 'pattern.pattern',
        description: 'pattern.description',
        reseller_id: 'pattern.level.reseller_id',
    }
}
