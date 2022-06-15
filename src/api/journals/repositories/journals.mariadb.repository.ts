import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {AuthResponseDto} from '../../../auth/dto/auth-response.dto'
import {db, internal} from '../../../entities'
import {Injectable, Logger} from '@nestjs/common'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {JournalSearchDto} from '../dto/journal-search.dto'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'

@Injectable()
export class JournalsMariadbRepository {
    private readonly log: Logger = new Logger(JournalsMariadbRepository.name)

    @HandleDbErrors
    async create(journal: internal.Journal): Promise<internal.Journal> {
        const dbJournal = db.billing.Journal.create()
        dbJournal.fromInternal(journal)

        await db.billing.Journal.insert(dbJournal)
        return dbJournal.toInternal()
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<internal.Journal> {
        const user: AuthResponseDto = req.user
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
    async readAll(req: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        const user: AuthResponseDto = req.user
        const qb = db.billing.Journal.createQueryBuilder('journal')
        qb.leftJoinAndSelect('journal.role', 'role')
        await configureQueryBuilder(qb, req.query, new SearchLogic(req, Object.keys(new JournalSearchDto())))

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

        this.log.debug({
            message: 'finding journal entries',
            resourceName: resourceName,
            resourceId: resourceId,
        })

        const [result, totalCount] = await qb.getManyAndCount()
        const hasAccessToContent = (await user.role_data.has_access_to).map(role => role.id)

        return [result.map(j => {
            if (!hasAccessToContent.includes(j.role_id))
                delete j.content
            return j.toInternal()
        }), totalCount]
    }
}