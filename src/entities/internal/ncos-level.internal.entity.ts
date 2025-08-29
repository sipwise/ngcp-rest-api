
export enum NCOSLevelMode {
    Whitelist = 'whitelist',
    Blacklist = 'blacklist'
}

export class NCOSLevel {
    id: number
    resellerId: number
    level: string
    mode: NCOSLevelMode
    localAc: boolean
    intraPbx: boolean
    description: string
    timeSetId?: number
    exposeToCustomer: boolean
    timeSetInvert: boolean
}