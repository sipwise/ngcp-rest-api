import {Injectable} from '@nestjs/common'
import {db, internal} from '../entities'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {LoggerService} from '../logger/logger.service'

@Injectable()
export class AclRoleRepository {
    private readonly log = new LoggerService(AclRoleRepository.name)

    async readOneByRole(role: string, _req: ServiceRequest): Promise<internal.AclRole> {
        const dbRole = await db.billing.AclRole.findOneOrFail({
            where: {role: role},
            relations: ['has_access_to', 'admins'],
        })
        return dbRole.toInternal()
    }
}
