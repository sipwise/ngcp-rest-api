import {Inject, Injectable} from '@nestjs/common'
import {JOURNAL_REPOSITORY} from '../../core/constants'
import {Journal} from './journal.entity'
import {JournalCreateDto} from './dto/journal.create.dto'
import {FindOptions, WhereOptions, Op} from 'sequelize'

@Injectable()
export class JournalService {
    /**
     * Creates a new `JournalService`
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
    async create(journal: JournalCreateDto): Promise<Journal> {
        return this.journalRepo.create<Journal>(journal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resource_name` and `resource_id`.
     * @param page Page limit
     * @param rows Rows per page limit
     * @param resource_name Name of the resource
     * @param resource_id ID of the named resource
     */
    async findAll(page?: string, rows?: string, resource_name?: string, resource_id?: string): Promise<Journal[]> {
        let filter: WhereOptions = {}
        if (resource_name !== undefined) {
            filter = {resource_name}
            if (resource_id !== undefined) {
                filter = {resource_name, resource_id}
            } else {
                filter = {
                    [Op.or]: [
                        { resource_name: resource_name },
                        { id: resource_name },
                    ]
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
    async findOne(id: number): Promise<Journal> {
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
