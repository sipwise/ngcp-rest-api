import {Inject, Injectable} from '@nestjs/common'
import {JOURNAL_OBJECT_REPOSITORY, JOURNAL_V2_REPOSITORY} from '../../config/constants.config'
import {JournalObject, Journal} from './journals.entity'
import {FindOptions} from 'sequelize'

@Injectable()
export class JournalsService {
    /**
     * Creates a new `JournalV2Service`
     * @param journalRepo Injected journal repository to access database
     */
    constructor(
        @Inject(JOURNAL_V2_REPOSITORY) private readonly journalRepo: typeof Journal,
        @Inject(JOURNAL_OBJECT_REPOSITORY) private readonly journalObjRepo: typeof JournalObject,
    ) {
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    async create(journal: Journal): Promise<Journal> {
        return this.journalRepo.create<Journal>(journal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resource_name` and `resource_id`.
     * @param page Page limit
     * @param rows Rows per page limit
     */
    async findAll(page?: string, rows?: string): Promise<Journal[]> {
        let result = await this.journalRepo.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
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

@Injectable()
export class JournalObjectService {
    constructor() {
    }
}
