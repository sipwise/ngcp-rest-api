import {Inject, Injectable} from '@nestjs/common'
import {JOURNAL_REPOSITORY} from '../../config/constants.config'
import {Journal} from '../../entities/db/billing/journal.entity'
import {CreateJournalDto} from './dto/create-journal.dto'
import {FindOptions, Op, WhereOptions} from 'sequelize'

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

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    async create(journal: CreateJournalDto): Promise<Journal> {
        return this.journalRepo.create<Journal>(journal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param page Page limit
     * @param rows Rows per page limit
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(page?: string, rows?: string, resourceName?: string, resourceId?: string): Promise<Journal[]> {
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
        return result.rows
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    async readOne(id: number): Promise<Journal> {
        return this.journalRepo.findOne<Journal>({where: {id}})
    }

    /**
     * Find one `Journal` by pattern
     * @param pattern FindOptions to filter results
     */
    async searchOne(pattern: FindOptions): Promise<Journal> {
        return this.journalRepo.findOne(pattern)
    }
}
