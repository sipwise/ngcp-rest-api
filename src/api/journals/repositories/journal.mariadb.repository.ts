import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {AuthResponseDto} from '../../../auth/dto/auth-response.dto'
import {db, internal} from '../../../entities'
import {Injectable} from '@nestjs/common'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {JournalSearchDto} from '../dto/journal-search.dto'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {JournalRepository} from '../interfaces/journal.repository'
import {LoggerService} from '../../../logger/logger.service'

@Injectable()
export class JournalMariadbRepository implements JournalRepository {
    private readonly log = new LoggerService(JournalMariadbRepository.name)

    @HandleDbErrors
    async create(journal: internal.Journal): Promise<internal.Journal> {
        const dbJournal = db.billing.Journal.create()
        dbJournal.fromInternal(journal)

        await db.billing.Journal.insert(dbJournal)
        return dbJournal.toInternal()
    }

    @HandleDbErrors
    async read(id: number, sr: ServiceRequest): Promise<internal.Journal> {
        const user: AuthResponseDto = sr.user
        const qb = db.billing.Journal.createQueryBuilder('journal')
        qb.where('journal.id = :id', {id: id})
        qb.leftJoinAndSelect('journal.role', 'role')

        if (user.reseller_id_required) {
            qb.andWhere('journal.reseller_id = :resellerId', {resellerId: user.reseller_id})
        }

        const result = await qb.getOneOrFail()

        return result.toInternal()
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        const user: AuthResponseDto = sr.user
        const qb = db.billing.Journal.createQueryBuilder('journal')
        qb.leftJoinAndSelect('journal.role', 'role')

        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new JournalSearchDto())))
        if (resourceName !== undefined) {
            qb.andWhere('journal.resource_name = :resourceName', {resourceName: resourceName})
            if (resourceId !== undefined) {
                qb.andWhere('journal.resource_id = :resourceId', {resourceId: resourceId})
            } else {
                qb.orWhere('journal.id = :resourceName', {resourceName: resourceName})
            }
        }

        if (user.reseller_id_required) {
            qb.andWhere('journal.reseller_id = :resellerId', {resellerId: user.reseller_id})
        }

        const [result, _totalCount] = await qb.getManyAndCount()
        const hasAccessToContent = (user.role_data.has_access_to).map(role => role.id)

        const parsedEntries: internal.Journal[] = []

        await Promise.all(Object.values(result).map(async (e) => {
            const entry = e.toInternal()
            if (hasAccessToContent.includes(entry.role_id))
                parsedEntries.push(entry)
        }))

        return [parsedEntries, parsedEntries.length]
    }
}