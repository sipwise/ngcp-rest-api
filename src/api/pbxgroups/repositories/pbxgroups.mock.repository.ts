import {PbxgroupsRepository} from '../interfaces/pbxgroups.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {PbxGroupMemberItem} from '../../../entities/internal'
import {NotFoundException} from '@nestjs/common'

interface PbxgroupsMockDB {
    [key: number]: internal.PbxGroup
}

export class PbxgroupsMockRepository implements PbxgroupsRepository {

    private readonly pbxgroupsDB: PbxgroupsMockDB

    constructor() {
        this.pbxgroupsDB = {
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

    readAll(req: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const groups: [internal.PbxGroup[], number] =
            [Object.keys(this.pbxgroupsDB).map(id => this.pbxgroupsDB[id]), Object.keys(this.pbxgroupsDB).length]
        return Promise.resolve(groups)
    }

    readById(id: number, req: ServiceRequest): Promise<internal.PbxGroup> {
        this.throwErrorIfIdNotExists(this.pbxgroupsDB, id)
        return Promise.resolve(this.pbxgroupsDB[id])
    }

    private throwErrorIfIdNotExists(db: any, id: number) {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}