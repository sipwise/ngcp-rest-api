import {Inject, Injectable} from '@nestjs/common'
import {isObject} from 'class-validator'

import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'

import {AppService} from '~/app.service'
import {HandleDbErrors} from '~/decorators/handle-db-errors.decorator'
import {internal} from '~/entities'
import Context from '~/helpers/context.helper'
import {obfuscatePasswordJSON} from '~/helpers/password-obfuscator.helper'
import {extractResourceName} from '~/helpers/uri.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

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
export class JournalService {
    private readonly log = new LoggerService(JournalService.name)

    constructor(
        private readonly app: AppService,
        @Inject(JournalMariadbRepository) private readonly journalRepo: JournalMariadbRepository,
    ) {
    }

    /**
     * Creates a new `Journal` entry in the database
     * @param journal Journal to be created
     */
    @HandleDbErrors
    async create(journal: internal.Journal, sr: ServiceRequest): Promise<internal.Journal> {
        const createdId = await this.journalRepo.create(journal)
        return await this.journalRepo.read(createdId, sr)
    }

    /**
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     */
    async readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        this.log.debug({
            message: 'finding journal entries',
            resourceName: resourceName,
            resourceId: resourceId,
        })
        return await this.journalRepo.readAll(sr, resourceName, resourceId)
    }

    /**
     * Find one `Journal` by ID
     * @param id ID of Journal
     */
    @HandleDbErrors
    async read(_id: number): Promise<internal.Journal> {
        return
    }

    public async writeJournal(sr: ServiceRequest, id: number, data: unknown): Promise<boolean> {
        // Set content format and default to json
        // TODO: Check if this even worked before as the 'content-type' was wrongly started with a capital letter
        let cf = contentFormat[sr.headers['content-type']]
        sr.headers['access-control-allow-credentials'] = 'true'
        if (cf === undefined) {
            cf = 'json'
        }

        // skip journaling if request method is not POST, PUT or DELETE
        const op = operation[sr.req.method]

        if (op === undefined) {
            return false
        }

        const resourceId = id

        const resourceName = extractResourceName(sr.req.path, this.app.config.common.api_prefix)

        const ctx = Context.get(sr.req)

        // create new Journal entry
        const entry = internal.Journal.create({
            reseller_id: sr.user.reseller_id,
            role_id: sr.user.role_data ? sr.user.role_data.id : null,
            role: sr.user.role,
            user_id: sr.user.id,
            tx_id: ctx.txid,
            content: Object.keys(data).length > 0
                ? isObject(data) || Array.isArray(data)
                    ? JSON.stringify(data, obfuscatePasswordJSON)
                    : Buffer.from(data as string).toString('base64') // TODO: Check if this is correct
                : '',
            content_format: cf,
            operation: op,
            resource_id: resourceId,
            resource_name: resourceName,
            timestamp: ctx.startTime / 1000,
            username: sr['user'] !== undefined ? sr.user.username : '',
        })

        this.log.debug('write journal entry')

        // write Journal entry to database
        await this.create(entry, sr)

        return true
    }
}
