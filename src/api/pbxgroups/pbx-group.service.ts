import {Inject, Injectable} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {PbxGroupMariadbRepository} from './repositories/pbx-group.mariadb.repository'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class PbxGroupService {
    private readonly log = new LoggerService(PbxGroupService.name)

    constructor(
        @Inject(PbxGroupMariadbRepository) private readonly pbxGroupRepo: PbxGroupMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        this.log.debug({
            message: 'read all pbxgroups',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return (await this.pbxGroupRepo.readAll(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.PbxGroup> {
        this.log.debug({message: 'read pbxgroup by group id', func: this.read.name, user: sr.user.username, id: id})
        return await this.pbxGroupRepo.readById(id, sr)
    }
}
