import {Inject, Injectable} from '@nestjs/common'
import {JOURNAL_REPOSITORY} from '../../config/constants.config'
import {Journal, JournalAttributes} from '../../entities/db/billing/journal.entity'
import {JournalCreateDto} from './dto/journal-create.dto'
import {FindOptions, Op, WhereOptions} from 'sequelize'
import {JournalResponseDto} from './dto/journal-response.dto'

@Injectable()
export class JournalsService {
    /**
     * Creates a new `JournalsService`
     * @param journalRepo Injected journal repository to access database
     */
    constructor(
        @Inject(JOURNAL_REPOSITORY) private readonly journalRepo: typeof Journal,
    ) {
    }

    private static toResponse(db: Journal): JournalResponseDto {
        return {
            content: db.content,
            content_format: db.content_format,
            operation: db.operation,
            resource_id: db.resource_id,
            resource_name: db.resource_name,
            timestamp: db.timestamp,
            username: db.username,
        }
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    async create(journal: JournalCreateDto): Promise<JournalResponseDto> {
        const dbJournal: JournalAttributes = {
            content: journal.content,
            content_format: journal.content_format,
            operation: journal.operation,
            resource_id: journal.resource_id,
            resource_name: journal.resource_name,
            timestamp: journal.timestamp,
            username: journal.username,
        }
        return JournalsService.toResponse(await this.journalRepo.create<Journal>(journal))
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param page Page limit
     * @param rows Rows per page limit
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(page?: string, rows?: string, resourceName?: string, resourceId?: string): Promise<JournalResponseDto[]> {
        let filter: WhereOptions = {}
        if (resourceName !== undefined) {
            filter = {resource_name: resourceName}
            if (resourceId !== undefined) {
                filter = {resource_name: resourceName, resource_id: resourceId}
            } else {
                filter = {
                    [Op.or]: [
                        {resource_name: resourceName},
                        {id: resourceName},
                    ],
                }
            }
        }
        let result = await this.journalRepo.findAndCountAll({
            limit: +rows,
            offset: +rows * (+page - 1),
            where: filter,
            attributes: {exclude: ['content']},
        })
        return result.rows.map(j => JournalsService.toResponse(j))
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    async readOne(id: number): Promise<JournalResponseDto> {
        return JournalsService.toResponse(await this.journalRepo.findOne<Journal>({where: {id}}))
    }

    /**
     * Find one `Journal` by pattern
     * @param pattern FindOptions to filter results
     */
    async searchOne(pattern: FindOptions): Promise<JournalResponseDto> {
        return JournalsService.toResponse(await this.journalRepo.findOne(pattern))
    }
}
