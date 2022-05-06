import {ApiProperty} from '@nestjs/swagger'
import {internal} from '../../../entities'

export class PbxgroupMember {
    extension: string
    subscriber_id: number
}

export class PbxgroupsResponseDto {
    customer_id: number
    extension: string
    hunt_policy: string
    hunt_timeout: number
    id: number
    @ApiProperty({
        type: PbxgroupMember,
    })
        members: PbxgroupMember[]
    name: string

    constructor(pbxGroup: internal.PbxGroup) {
        this.customer_id = pbxGroup.customer_id
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.id = pbxGroup.id
        this.members = pbxGroup.members.map(member => ({
            extension: member.extension,
            subscriber_id: member.subscriberId,
        }))
        this.name = pbxGroup.name
    }
}
