import {ApiProperty} from '@nestjs/swagger'
import {internal} from '../../../entities'

export class PbxgroupMember {
    extension: string
    subscriber_id: number
}

export class PbxgroupsResponseDto {
    extension: string
    hunt_policy: string
    hunt_timeout: number
    subscriber_id: number
    @ApiProperty({
        type: PbxgroupMember,
    })
        members: PbxgroupMember[]
    name: string

    constructor(pbxGroup: internal.PbxGroup) {
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.subscriber_id = pbxGroup.id
        this.members = pbxGroup.members.map(member => ({extension: member.extension, subscriber_id: member.subscriberId}))
        this.name = pbxGroup.name
    }
}
