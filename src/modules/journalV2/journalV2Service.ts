import {Inject, Injectable} from '@nestjs/common'
import {JOURNAL_OBJECT_REPOSITORY, JOURNAL_V2_REPOSITORY} from '../../core/constants'
import {JournalObject, JournalV2} from './journalV2.entity'
import {FindOptions} from 'sequelize'

@Injectable()
export class JournalV2Service {
    /**
     * Creates a new `JournalV2Service`
     * @param journalRepo Injected journal repository to access database
     */
    constructor(
        @Inject(JOURNAL_V2_REPOSITORY) private readonly journalRepo: typeof JournalV2,
        @Inject(JOURNAL_OBJECT_REPOSITORY) private readonly journalObjRepo: typeof JournalObject,
    ) {
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    async create(journal: JournalV2): Promise<JournalV2> {
        return this.journalRepo.create<JournalV2>(journal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resource_name` and `resource_id`.
     * @param page Page limit
     * @param rows Rows per page limit
     */
    async findAll(page?: string, rows?: string): Promise<JournalV2[]> {
        let result = await this.journalRepo.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
        return result.rows
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    async findOne(id: number): Promise<JournalV2> {
        return this.journalRepo.findOne<JournalV2>({where: {id}})
    }

    /**
     * Find one `Journal` by pattern
     * @param pattern FindOptions to filter results
     */
    async searchOne(pattern: FindOptions): Promise<JournalV2> {
        return this.journalRepo.findOne(pattern)
    }
}

@Injectable()
export class JournalObjectService {
    constructor() {
    }
}
