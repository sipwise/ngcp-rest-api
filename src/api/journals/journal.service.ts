import {ForbiddenException, Inject, Injectable} from '@nestjs/common'
import {isObject} from 'class-validator'

import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'

import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import Context from '~/helpers/context.helper'
import {obfuscatePasswordJSON} from '~/helpers/password-obfuscator.helper'
import {extractResourceName} from '~/helpers/uri.helper'
import {mapYield} from '~/helpers/yield.helper'
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
     * Find all `Journal` entries. Allows to provide search filters for `resourceName` and `resourceId`.
     * Journals are admin-only, subscriber roles get 403.
     * @param resourceName Name of the resource
     * @param resourceId ID of the named resource
     * @param resourceVerified the caller already read the resource within its scope (nested `:id/journal` routes)
     */
    async readAll(sr: ServiceRequest, resourceName?: string, resourceId?: number | string, resourceVerified = false): Promise<[internal.Journal[], number]> {
        this.log.debug({
            message: 'finding journal entries',
            resourceName: resourceName,
            resourceId: resourceId,
        })
        this.checkAccess(sr)
        return await this.journalRepo.readAll(sr, resourceName, resourceId, resourceVerified)
    }

    checkAccess(sr: ServiceRequest): void {
        if (sr.user.role == RbacRole.subscriber || sr.user.role == RbacRole.subscriberadmin)
            throw new ForbiddenException()
    }

    /**
     * Returns the journal resource name of the requested route, e.g. `customers/phonebook` for
     * `/customers/phonebook/:id` and `/customers/phonebook/:id/journal`
     */
    resourceName(sr: ServiceRequest): string {
        return extractResourceName(sr.req.route?.path ?? sr.req.path, this.app.config.common.api_prefix)
    }

    public async writeJournal(sr: ServiceRequest, id: number, data: unknown): Promise<boolean> {
        return await this.writeJournals(sr, [{id, data}])
    }

    /**
     * One journal entry per resource of the request, `data` is its content
     */
    public async writeJournals(sr: ServiceRequest, entries: {id: number, data: unknown}[]): Promise<boolean> {
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

        const resourceName = this.resourceName(sr)

        const ctx = Context.get(sr.req)

        const journals = await mapYield(entries, entry => internal.Journal.create({
            reseller_id: sr.user.reseller_id,
            role_id: sr.user.role_data ? sr.user.role_data.id : null,
            role: sr.user.role,
            user_id: sr.user.id,
            tx_id: ctx.txid,
            content: journalContent(entry.data),
            content_format: cf,
            operation: op,
            resource_id: entry.id,
            resource_name: resourceName,
            timestamp: ctx.startTime / 1000,
            username: sr['user'] !== undefined ? sr.user.username : '',
        }))

        this.log.debug('write journal entries')

        await this.journalRepo.create(journals)

        return true
    }
}

function journalContent(data: unknown): string {
    if (Object.keys(data).length == 0)
        return ''
    if (isObject(data) || Array.isArray(data))
        return JSON.stringify(data, obfuscatePasswordJSON)
    return Buffer.from(data as string).toString('base64') // TODO: Check if this is correct
}
