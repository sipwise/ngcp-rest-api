import {JournalsRepository} from '../interfaces/journals.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'

interface JournalsMockDB {
    [key: number]: internal.Journal
}

export class JournalsMockRepository implements JournalsRepository {

    private readonly journalsDB: JournalsMockDB

    constructor() {
        this.journalsDB = {
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

    create(journal: internal.Journal): Promise<internal.Journal> {
        return Promise.resolve(undefined)
    }

    read(id: number, req: ServiceRequest): Promise<internal.Journal> {
        return Promise.resolve(undefined)
    }

    readAll(req: ServiceRequest, resourceName?: string, resourceId?: number | string): Promise<[internal.Journal[], number]> {
        return Promise.resolve([[], 0])
    }

}