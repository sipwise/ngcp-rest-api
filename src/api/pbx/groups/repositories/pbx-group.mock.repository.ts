import {PbxGroupRepository} from '~/api/pbx/groups/interfaces/pbx-group.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {PbxGroupMember} from '~/entities/internal'
import {NotFoundException} from '@nestjs/common'

interface PbxGroupMockDB {
    [key: number]: internal.PbxGroup
}

export class PbxGroupMockRepository implements PbxGroupRepository {

    private readonly pbxGroupDB: PbxGroupMockDB

    constructor() {
        const member1 = new PbxGroupMember()
        member1.extension = '102'
        member1.subscriberId = 11
        member1.username = 'test1'
        member1.domain = 'example.org'

        const member2 = new PbxGroupMember()
        member2.extension = '102'
        member2.subscriberId = 12
        member2.username = 'test2'
        member2.domain = 'example.org'

        this.pbxGroupDB = {
            1: internal.PbxGroup.create({
                customerId: 1,
                extension: '100',
                huntPolicy: '',
                huntTimeout: 0,
                id: 1,
                members: [
                    member1,
                    member2,
                ],
                name: 'group1',
                domain: 'example.org',
            }),
        }
    }

    readAll(_sr: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const groups: [internal.PbxGroup[], number] =
            [Object.keys(this.pbxGroupDB).map(id => this.pbxGroupDB[id]), Object.keys(this.pbxGroupDB).length]
        return Promise.resolve(groups)
    }

    readById(id: number, _sr: ServiceRequest): Promise<internal.PbxGroup> {
        this.throwErrorIfIdNotExists(this.pbxGroupDB, id)
        return Promise.resolve(this.pbxGroupDB[id])
    }

    private throwErrorIfIdNotExists(db: any, id: number): void {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}