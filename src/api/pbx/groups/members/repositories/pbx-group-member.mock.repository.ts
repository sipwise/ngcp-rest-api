import {NotFoundException} from '@nestjs/common'

import {PbxGroupMemberRepository} from '~/api/pbx/groups/members/interfaces/pbx-group-member.repository'
import {internal} from '~/entities'
import {PbxGroupMember} from '~/entities/internal'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface PbxGroupMemberMockDB {
    [key: number]: internal.PbxGroupMember
}

export class PbxGroupMockRepository implements PbxGroupMemberRepository {

    private readonly pbxGroupMemberDB: PbxGroupMemberMockDB

    constructor() {
        const member1 = new PbxGroupMember()
        member1.id = 1
        member1.groupId = 1
        member1.extension = '102'
        member1.subscriberId = 11
        member1.username = 'test1'
        member1.domain = 'example.org'

        const member2 = new PbxGroupMember()
        member2.id = 2
        member2.groupId = 1
        member2.extension = '102'
        member2.subscriberId = 12
        member2.username = 'test2'
        member2.domain = 'example.org'

        this.pbxGroupMemberDB = {
            1: member1,
            2: member2,
        }
    }

    readAll(_sr: ServiceRequest): Promise<[internal.PbxGroupMember[], number]> {
        const groups: [internal.PbxGroupMember[], number] =
            [Object.keys(this.pbxGroupMemberDB).map(id => this.pbxGroupMemberDB[id]), Object.keys(this.pbxGroupMemberDB).length]
        return Promise.resolve(groups)
    }

    readById(id: number, _sr: ServiceRequest): Promise<internal.PbxGroupMember> {
        this.throwErrorIfIdNotExists(this.pbxGroupMemberDB, id)
        return Promise.resolve(this.pbxGroupMemberDB[id])
    }

    private throwErrorIfIdNotExists(db: any, id: number): void {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}