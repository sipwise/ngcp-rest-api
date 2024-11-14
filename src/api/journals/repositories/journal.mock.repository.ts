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

    create(_journal: internal.Journal): Promise<number> {
        return Promise.resolve(undefined)
    }

    read(_id: number, _sr: ServiceRequest): Promise<internal.Journal> {
        return Promise.resolve(undefined)
    }

    readAll(_sr: ServiceRequest, _resourceName?: string, _resourceId?: number | string): Promise<[internal.Journal[], number]> {
        return Promise.resolve([[] as internal.Journal[], 0])
    }

}