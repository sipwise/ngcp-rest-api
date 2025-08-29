import {NCOSLevelMode} from '~/entities/internal/ncos-level.internal.entity'

export class NCOSLevelSearchDto {
    reseller_id: number = undefined
    level: number = undefined
    mode: NCOSLevelMode = undefined
    local_ac: boolean = undefined
    intra_pbx: boolean = undefined
    description: string = undefined
    time_set_id: number = undefined
    time_set_invert: boolean = undefined
    expose_to_customer: boolean = undefined
    _alias = {
        reseller_id: 'ncosLevel.reseller_id',
        level: 'ncosLevel.level',
        mode: 'ncosLevel.mode',
        local_ac: 'ncosLevel.local_ac',
        intra_pbx: 'ncosLevel.intra_pbx',
        description: 'ncosLevel.description',
        time_set_id: 'ncosLevel.time_set_id',
        expose_to_customer: 'ncosLevel.expose_to_customer',
    }
}
