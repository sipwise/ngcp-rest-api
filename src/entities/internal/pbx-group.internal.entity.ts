import {internal} from 'entities'

export interface PbxGroupInternalEntity {
    provisioningGroupId?: number
    billingGroupId?: number
    name: string
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: internal.PbxGroupMember[]
    id?: number
    customerId: number
    domain: string
}

export class PbxGroup implements PbxGroupInternalEntity {
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: internal.PbxGroupMember[]
    name: string
    id: number
    customerId: number
    domain: string

    static create(data: PbxGroupInternalEntity): PbxGroup {
        const group = new PbxGroup()
        Object.keys(data).map(key => {
            group[key] = data[key]
        })
        return group
    }
}