import {ApiProperty} from '@nestjs/swagger'
import {ResponseDto} from '../../../dto/response.dto'
import {internal} from '../../../entities'

export class PbxGroupMember implements ResponseDto {
    extension: string
    subscriber_id: number
    username: string
    domain: string
}

export class PbxGroupResponseDto {
    customer_id: number
    extension: string
    hunt_policy: string
    hunt_timeout: number
    id: number
    @ApiProperty({
        type: PbxGroupMember,
    })
        members: PbxGroupMember[]
    name: string
    domain: string

    constructor(pbxGroup: internal.PbxGroup) {
        this.customer_id = pbxGroup.customerId
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.id = pbxGroup.id
        this.domain = pbxGroup.domain
        this.members = pbxGroup.members
            ? pbxGroup.members.map(member => ({
                extension: member.extension,
                subscriber_id: member.subscriberId,
                username: member.username,
                domain: member.domain,
            }))
            : []
        this.name = pbxGroup.name
    }
}
