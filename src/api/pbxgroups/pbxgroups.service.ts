import {Injectable, Logger} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {PbxgroupsMariadbRepository} from './repositories/pbxgroups.mariadb.repository'

@Injectable()
export class PbxgroupsService {
    private readonly log: Logger = new Logger(PbxgroupsService.name)

    constructor(
        private readonly pbxgroupsRepo: PbxgroupsMariadbRepository,
    ) {
    }

    async readAll(req: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        this.log.debug({
            message: 'read all pbxgroups',
            func: this.readAll.name,
            user: req.user.username,
        })
        return (await this.pbxgroupsRepo.readAll(req))
    }

    async read(id: number, req: ServiceRequest): Promise<internal.PbxGroup> {
        this.log.debug({message: 'read pbxgroup by group id', func: this.read.name, user: req.user.username, id: id})
        return await this.pbxgroupsRepo.readById(id, req)
    }
}