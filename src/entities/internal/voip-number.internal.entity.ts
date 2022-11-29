export enum VoipNumberStatus {
    Active = 'active',
    Locked = 'locked',
    Reserved = 'reserved',
    Deported = 'deported',
}

interface VoipNumberInternalEntity {
    id: number
    cc: number
    ac: string
    sn: string
    isPrimary: boolean
    isDevID: boolean
    subscriberID: number
    contractID: number
    resellerID: number
}

export class VoipNumber implements VoipNumberInternalEntity {
    id: number
    cc: number
    ac: string
    sn: string
    isPrimary: boolean
    isDevID: boolean
    subscriberID: number
    contractID: number
    resellerID: number

    static create(data: VoipNumberInternalEntity): VoipNumber {
        const sub = new VoipNumber()

        Object.keys(data).map(key => {
            sub[key] = data[key]
        })
        return sub
    }
}
