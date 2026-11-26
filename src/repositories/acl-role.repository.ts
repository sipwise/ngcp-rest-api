import {Injectable} from '@nestjs/common'
import {In} from 'typeorm'

import {db, internal} from '~/entities'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class AclRoleRepository {
    private readonly log = new LoggerService(AclRoleRepository.name)

    async readByRoles(roles: string[]): Promise<internal.AclRole[]> {
        const dbRoles = await db.billing.AclRole.find({
            where: {role: In(roles)},
            relations: {has_access_to: true},
        })
        return dbRoles.map(role => role.toInternal())
    }
}
