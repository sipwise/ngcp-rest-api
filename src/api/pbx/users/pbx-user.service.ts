import {Injectable} from '@nestjs/common'

import {PbxUserOptions} from './interfaces/pbx-user-options.interface'
import {PbxUserMariadbRepository} from './repositories/pbx-user.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PbxUserService implements CrudService<internal.PbxUser> {
    private readonly log = new LoggerService(PbxUserService.name)

    constructor(
        private readonly pbxUserRepo: PbxUserMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.PbxUser[], number]> {
        return this.pbxUserRepo.readAll(this.getPbxUserOptionsFromServiceRequest(sr), sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.PbxUser> {
        return await this.pbxUserRepo.readById(id, this.getPbxUserOptionsFromServiceRequest(sr), sr)
    }

    getPbxUserOptionsFromServiceRequest(sr: ServiceRequest): PbxUserOptions {
        const options:PbxUserOptions = {
            filterBy: {
                id: undefined,
                resellerId: undefined,
                customerId: undefined,
            },
        }
        if (sr.user.reseller_id_required) {
            options.filterBy.resellerId = sr.user.reseller_id
        }

        // TODO: Instead of this add the customer_id_required flag to the user object?
        if (sr.user.role === RbacRole.subscriberadmin) {
            options.filterBy.customerId = sr.user.customer_id
        }

        if (sr.user.role === RbacRole.subscriber) {
            options.filterBy.id = sr.user.subscriber_id
        }

        return options
    }
}
