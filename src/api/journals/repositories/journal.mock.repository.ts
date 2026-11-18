import {JournalRepository} from '~/api/journals/interfaces/journal.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface JournalMockDB {
    [key: number]: internal.Journal
}

export class JournalMockRepository implements JournalRepository {

    private readonly journalDB: JournalMockDB

    constructor() {
        this.journalDB = {
            1: internal.Journal.create({
                content_format: '',
                id: 1,
                operation: '',
                reseller_id: 0,
                resource_id: 0,
                resource_name: '',
                role: '',
                role_id: 0,
                timestamp: 0,
                tx_id: '',
                user_id: 0,
                username: '',
            }),
        }
    }

    create(journals: internal.Journal[]): Promise<void> {
        for (const journal of journals) {
            journal.id = Math.max(...Object.keys(this.journalDB).map(Number)) + 1
            this.journalDB[journal.id] = journal
        }
        return Promise.resolve()
    }

    readAll(_sr: ServiceRequest, resourceName?: string, resourceId?: number | string, _resourceVerified?: boolean): Promise<[internal.Journal[], number]> {
        const journals = (Object.values(this.journalDB) as internal.Journal[]).filter(j =>
            (resourceName === undefined || j.resource_name == resourceName) &&
            (resourceId === undefined || j.resource_id == resourceId))
        return Promise.resolve([journals, journals.length])
    }

}
