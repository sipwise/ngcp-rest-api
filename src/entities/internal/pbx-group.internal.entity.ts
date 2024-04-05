export class PbxGroupMemberItem {
    extension: string
    subscriberId: number
    username: string
    domain: string

    constructor(extension: string, subscriberId: number, username: string, domain: string) {
        this.extension = extension
        this.subscriberId = subscriberId
        this.username = username
        this.domain = domain
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
    customerId: number
    domain: string
}

export class PbxGroup implements PbxGroupInternalEntity {
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: PbxGroupMemberItem[]
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