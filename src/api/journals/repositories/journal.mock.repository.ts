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

    create(journal: internal.Journal): Promise<number> {
        const id = Math.max(...Object.keys(this.journalDB).map(Number)) + 1
        journal.id = id
        this.journalDB[id] = journal
        return Promise.resolve(id)
    }

    read(id: number, _sr: ServiceRequest): Promise<internal.Journal> {
        return Promise.resolve(this.journalDB[id])
    }

    readAll(_sr: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        const journals = (Object.values(this.journalDB) as internal.Journal[]).filter(j =>
            (resourceName === undefined || j.resource_name == resourceName) &&
            (resourceId === undefined || j.resource_id == resourceId))
        return Promise.resolve([journals, journals.length])
    }

}
