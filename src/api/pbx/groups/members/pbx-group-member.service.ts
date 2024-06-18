import {Inject, Injectable} from '@nestjs/common'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {internal} from '../../../../entities'
import {FilterBy, PbxGroupMemberMariadbRepository} from './repositories/pbx-group-member.mariadb.repository'
import {LoggerService} from '../../../../logger/logger.service'

@Injectable()
export class PbxGroupMemberService {
    private readonly log = new LoggerService(PbxGroupMemberService.name)

    constructor(
        @Inject(PbxGroupMemberMariadbRepository) private readonly pbxGroupMemberRepo: PbxGroupMemberMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.PbxGroupMember[], number]> {
        this.log.debug({
            message: 'read all pbxgroups',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const filters = this.getFiltersFromRequest(sr)
        return (await this.pbxGroupMemberRepo.readAll(sr, filters))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.PbxGroupMember> {
        this.log.debug({
            message: 'read pbxgroup member by group id',
            func: this.read.name,
            user: sr.user.username,
            id: id,
        })
        const filters = this.getFiltersFromRequest(sr)
        return await this.pbxGroupMemberRepo.readById(id, sr, filters)
    }

    private getFiltersFromRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['groupId']) {
            filterBy.groupId = +sr.params['groupId']
        }
        return filterBy
    }
}
