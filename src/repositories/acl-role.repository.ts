import {Injectable, Logger} from '@nestjs/common'
import {db, internal} from '../entities'
import {ServiceRequest} from '../interfaces/service-request.interface'

@Injectable()
export class AclRoleRepository {
    private readonly log = new Logger(AclRoleRepository.name)

    async readOneByRole(role: string, req: ServiceRequest): Promise<internal.AclRole> {
        const dbRole = await db.billing.AclRole.findOneOrFail({
            where: {role: role},
            relations: ['has_access_to', 'admins'],
        })
        return dbRole.toDomain()
    }
}
