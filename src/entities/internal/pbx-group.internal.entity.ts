export class PbxGroupMemberItem {
    extension: string
    subscriberId: number

    constructor(extension: string, subscriberId: number) {
        this.extension = extension
        this.subscriberId = subscriberId
    }
}

export interface PbxGroupInternalEntity {
    provisioningGroupId?: number
    billingGroupId?: number
    name: string
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: PbxGroupMemberItem[]
    id?: number
    customer_id: number
}

export class PbxGroup implements PbxGroupInternalEntity {
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: PbxGroupMemberItem[]
    name: string
    id: number
    customer_id: number

    static create(data: PbxGroupInternalEntity): PbxGroup {
        const group = new PbxGroup()
        Object.keys(data).map(key => {
            group[key] = data[key]
        })
        return group
    }
}