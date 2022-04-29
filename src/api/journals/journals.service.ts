import {Injectable, Logger} from '@nestjs/common'
import {internal} from '../../entities'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {JournalsMariadbRepository} from './repositories/journals.mariadb.repository'

@Injectable()
export class JournalsService {
    private readonly log = new Logger(JournalsService.name)

    constructor(
        private readonly journalsRepo: JournalsMariadbRepository,
    ) {
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    @HandleDbErrors
    async create(journal: internal.Journal): Promise<internal.Journal> {
        return await this.journalsRepo.create(journal)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(req: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        this.log.debug({
            message: 'finding journal entries',
            resourceName: resourceName,
            resourceId: resourceId,
        })
        return await this.journalsRepo.readAll(req, resourceName, resourceId)
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    @HandleDbErrors
    async read(id: number): Promise<internal.Journal> {
        return
    }
}
