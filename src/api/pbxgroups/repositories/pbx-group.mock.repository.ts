import {PbxGroupRepository} from '../interfaces/pbx-group.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {PbxGroupMemberItem} from '../../../entities/internal'
import {NotFoundException} from '@nestjs/common'

interface PbxGroupMockDB {
    [key: number]: internal.PbxGroup
}

export class PbxGroupMockRepository implements PbxGroupRepository {

    private readonly pbxGroupDB: PbxGroupMockDB

    constructor() {
        this.pbxGroupDB = {
            1: internal.PbxGroup.create({
                customer_id: 1,
                extension: '100',
                huntPolicy: '',
                huntTimeout: 0,
                id: 1,
                members: [new PbxGroupMemberItem('102', 11), new PbxGroupMemberItem('102', 12)],
                name: 'group1',
            }),
        }
    }

    readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const groups: [internal.PbxGroup[], number] =
            [Object.keys(this.pbxGroupDB).map(id => this.pbxGroupDB[id]), Object.keys(this.pbxGroupDB).length]
        return Promise.resolve(groups)
    }

    readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroup> {
        this.throwErrorIfIdNotExists(this.pbxGroupDB, id)
        return Promise.resolve(this.pbxGroupDB[id])
    }

    private throwErrorIfIdNotExists(db: any, id: number) {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}