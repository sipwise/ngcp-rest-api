export class PbxGroupMemberItem {
    extension: string
    subscriberId: number
}

export interface PbxGroupInterface {
    provisioningGroupId?: number
    billingGroupId?: number
    name: string
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: PbxGroupMemberItem[]
}

export class PbxGroup implements PbxGroupInterface {
    extension: string
    huntPolicy: string
    huntTimeout: number
    members: PbxGroupMemberItem[]
    name: string
    id: number
}