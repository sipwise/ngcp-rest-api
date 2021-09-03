import {Injectable} from '@nestjs/common'
import {FindOptions} from 'sequelize'
import {AppService} from '../../app.sevice'
import {db} from '../../entities'
import {JournalCreateDto} from './dto/journal-create.dto'
import {JournalResponseDto} from './dto/journal-response.dto'

@Injectable()
export class JournalsService {
    /**
     * Creates a new `JournalsService`
     * @param journalRepo Injected journal repository to access database
     */
    constructor(
        private readonly app: AppService
    ) {
    }

    private static toResponse(db: db.billing.Journal): JournalResponseDto {
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

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    async create(journal: JournalCreateDto): Promise<JournalResponseDto> {
        const dbJournal = db.billing.Journal.create(journal)
        await db.billing.Journal.insert(dbJournal)
        return JournalsService.toResponse(dbJournal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param page Page limit
     * @param rows Rows per page limit
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(page?: string, rows?: string, resourceName?: string, resourceId?: string): Promise<JournalResponseDto[]> {
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
        let result = await db.billing.Journal.find({
            take: +rows,
            skip: +rows * (+page - 1),
            where: filter,
        })
        return result.map(j => {
            delete j.content
            return JournalsService.toResponse(j)
        })
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    async readOne(id: number): Promise<JournalResponseDto> {
        return JournalsService.toResponse(await db.billing.Journal.findOne(id))
    }

    /**
     * Find one `Journal` by pattern
     * @param pattern FindOptions to filter results
     */
    async searchOne(pattern: FindOptions): Promise<JournalResponseDto> {
        return JournalsService.toResponse(await db.billing.Journal.findOne({where: pattern}))
    }
}
