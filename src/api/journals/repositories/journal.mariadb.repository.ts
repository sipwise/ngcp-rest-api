import {Injectable} from '@nestjs/common'
import {Brackets} from 'typeorm'

import {JournalSearchDto} from '~/api/journals/dto/journal-search.dto'
import {JournalRepository} from '~/api/journals/interfaces/journal.repository'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

// rows per INSERT, keeps bulk statements well below max_allowed_packet
const INSERT_CHUNK_SIZE = 1000

// roles whose users only act within their own reseller
const resellerBoundRoles = [RbacRole.reseller, RbacRole.ccare]

@Injectable()
export class JournalMariadbRepository extends MariaDbRepository implements JournalRepository {
    private readonly log = new LoggerService(JournalMariadbRepository.name)

    async create(journals: internal.Journal[]): Promise<void> {
        const rows = await mapYield(journals, journal => {
            const row = db.billing.Journal.create()
            row.fromInternal(journal)
            return row
        })
        for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE)
            await db.billing.Journal.insert(rows.slice(i, i + INSERT_CHUNK_SIZE))
    }

    async readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string, resourceVerified = false): Promise<[internal.Journal[], number]> {
        const user: AuthResponseDto = sr.user
        const resellerScoped = user.reseller_id_required && !resourceVerified
        const roleIds = (user.role_data?.has_access_to ?? [])
            .filter(role => !resellerScoped || resellerBoundRoles.includes(role.role as RbacRole))
            .map(role => role.id)
        if (!roleIds.length)
            return [[], 0]

        const qb = db.billing.Journal.createQueryBuilder('journal')
        qb.leftJoinAndSelect('journal.role', 'role')
        const searchDto = new JournalSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        if (resourceName !== undefined) {
            if (resourceId !== undefined) {
                qb.andWhere('journal.resource_name = :resourceName', {resourceName: resourceName})
                qb.andWhere('journal.resource_id = :resourceId', {resourceId: resourceId})
            } else {
                qb.andWhere(new Brackets(b => b
                    .where('journal.resource_name = :resourceName', {resourceName: resourceName})
                    .orWhere('journal.id = :resourceName', {resourceName: resourceName})))
            }
        }

        qb.andWhere(new Brackets(b => b
            .where('journal.role_id IN (:...journalRoleIds)', {journalRoleIds: roleIds})
            .orWhere('journal.role_id IS NULL')))

        if (resellerScoped)
            qb.andWhere('journal.reseller_id = :resellerId', {resellerId: user.reseller_id})

        if (!user.is_master) {
            qb.andWhere(new Brackets(b => b
                .where('journal.resource_name != :adminsResourceName', {adminsResourceName: 'admins'})
                .orWhere('journal.resource_id = :selfId', {selfId: user.id})))
        }

        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map(e => e.toInternal()), totalCount]
    }
}