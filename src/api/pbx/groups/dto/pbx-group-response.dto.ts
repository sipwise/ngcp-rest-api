import {UrlReference} from '../../../../types/url-reference.type'
import {internal} from '../../../../entities'

export class PbxGroupResponseDto {
    customer_id: number
    extension: string
    hunt_policy: string
    hunt_timeout: number
    id: number
    members: UrlReference
    name: string
    domain: string

    constructor(prefix:string, pbxGroup: internal.PbxGroup) {
        this.customer_id = pbxGroup.customerId
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.id = pbxGroup.id
        this.domain = pbxGroup.domain
        this.members = {
            type: 'link',
            url: prefix + '/' + pbxGroup.id + '/members',
        }
        this.name = pbxGroup.name
    }
}
