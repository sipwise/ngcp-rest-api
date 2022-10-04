import {Injectable} from '@nestjs/common'
import {internal} from '../../entities'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {JournalsMariadbRepository} from './repositories/journals.mariadb.repository'
import {extractResourceName} from '../../helpers/uri.helper'
import {AppService} from '../../app.service'
import Context from '../../helpers/context.helper'
import {isObject} from 'class-validator'
import {obfuscatePasswordJSON} from '../../helpers/password-obfuscator.helper'
import {LoggerService} from '../../logger/logger.service'

const operation = {
    'PATCH': 'update',
    'POST': 'create',
    'PUT': 'update',
    'DELETE': 'delete',
}

/**
 * Lookup-table for Content-Type
 */
const contentFormat = {
    'application/json': 'json',
}

@Injectable()
export class JournalsService {
    private readonly log = new LoggerService(JournalsService.name)

    constructor(
        private readonly app: AppService,
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

    public async writeJournal(req: ServiceRequest, id: number, data: any) {
        // Set content format and default to json
        let cf = contentFormat[req.headers['Content-Type']]
        if (cf === undefined) {
            cf = 'json'
        }

        // skip journaling if request method is not POST, PUT or DELETE
        const op = operation[req.init.method]
        if (op === undefined) {
            return false
        }

        const resourceId = id
        const resourceName = extractResourceName(req.init.path, this.app.config.common.api_prefix)

        const ctx = Context.get(req.init)

        // create new Journal entry
        const entry = internal.Journal.create({
            reseller_id: req.user.reseller_id,
            role_id: req.user.role_data ? req.user.role_data.id : null,
            role: req.user.role,
            user_id: req.user.id,
            tx_id: ctx.txid,
            content: Object.keys(data).length > 0
                ? isObject(data) || Array.isArray(data)
                    ? JSON.stringify(data, obfuscatePasswordJSON)
                    : Buffer.from(data)
                : '',
            content_format: cf,
            operation: op,
            resource_id: resourceId,
            resource_name: resourceName,
            timestamp: ctx.startTime / 1000,
            username: req['user'] !== undefined ? req.user.username : '',
        })

        this.log.debug('write journal entry')

        // write Journal entry to database
        await this.create(entry)

        return true
    }
}
