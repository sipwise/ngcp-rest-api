export class NCOSPatternSearchDto {
    ncos_level_id: number = undefined
    pattern: string = undefined
    description: string = undefined
    reseller_id: number = undefined
    _alias = {
        ncos_level_id: 'pattern.ncos_level_id',
        pattern: 'pattern.pattern',
        description: 'pattern.description',
        reseller_id: 'pattern.level.reseller_id',
    }
}
