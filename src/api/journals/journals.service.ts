import {Injectable, Logger} from '@nestjs/common'
import {FindManyOptions} from 'typeorm'
import {db} from '../../entities'
import {JournalCreateDto} from './dto/journal-create.dto'
import {JournalResponseDto} from './dto/journal-response.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'

@Injectable()
export class JournalsService {
    private readonly log = new Logger(JournalsService.name)

    /**
     * Creates a new `JournalsService`
     * @param journalRepo Injected journal repository to access database
     */
    constructor() {
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    @HandleDbErrors
    async create(journal: JournalCreateDto): Promise<JournalResponseDto> {
        delete journal.content
        let dbJournal = db.billing.Journal.create(journal)
        // dbJournal.operation = journal.operation
        // dbJournal.resource_name = journal.resource_name
        // dbJournal.resource_id = journal.resource_id
        // dbJournal.timestamp = journal.timestamp
        // dbJournal.username = journal.username
        // dbJournal.content_format = journal.content_format
        await db.billing.Journal.insert(dbJournal)
        return this.toResponse(dbJournal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param page Page limit
     * @param rows Rows per page limit
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(page?: number, rows?: number, resourceName?: string, resourceId?: number | string): Promise<JournalResponseDto[]> {
        let filter = {}
        if (resourceName !== undefined) {
            filter = {resource_name: resourceName}
            if (resourceId !== undefined) {
                filter = {resource_name: resourceName, resource_id: resourceId}
            } else {
                filter = [
                    {resource_name: resourceName},
                    {id: resourceName},
                ]
            }
        }
        this.log.debug({
            message: 'finding journal entries',
            resourceName: resourceName,
            resourceId: resourceId,
            filter: filter,
        })
        let result = await db.billing.Journal.find({
            take: +rows,
            skip: +rows * (+page - 1),
            where: filter,
        })
        return result.map(j => {
            delete j.content
            return this.toResponse(j)
        })
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    @HandleDbErrors
    async readOne(id: number): Promise<JournalResponseDto> {
        return this.toResponse(await db.billing.Journal.findOne(id))
    }

    /**
     * Find one `Journal` by pattern
     * @param pattern FindOptions to filter results
     */
    @HandleDbErrors
    async searchOne(pattern: FindManyOptions): Promise<JournalResponseDto> {
        return this.toResponse(await db.billing.Journal.findOne({where: pattern}))
    }

    private toResponse(db: db.billing.Journal): JournalResponseDto {
        return {
            id: db.id,
            content: db.content,
            content_format: db.content_format,
            operation: db.operation,
            resource_id: db.resource_id,
            resource_name: db.resource_name,
            timestamp: db.timestamp,
            username: db.username,
        }
    }
}
