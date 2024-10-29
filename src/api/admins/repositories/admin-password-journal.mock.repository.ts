
import {AdminPasswordJournalRepository} from '~/api/admins/interfaces/admin-password-journal.repository'
import {internal} from '~/entities'

interface AdminPasswordJournalMockDB {
    [key: number]: internal.AdminPasswordJournal
}

export class AdminPasswordJournalMockRepository implements AdminPasswordJournalRepository {
    private readonly db: AdminPasswordJournalMockDB

    constructor() {
        this.db = {
            1: internal.AdminPasswordJournal.create({
                id: 1,
                admin_id: 1,
                value: 'password',
            }),
        }
    }

    async keepLastNPasswords(adminId: number, n: number): Promise<void> {
        const journals = Object.values(this.db).filter(journal => journal.admin_id === adminId)
        const journalsToDelete = journals.slice(0, -n)
        journalsToDelete.forEach(journal => delete this.db[journal.id])
    }

    async create(journals: internal.AdminPasswordJournal[]): Promise<number[]> {
        const nextId = this.getNextId()
        journals[0].id = nextId
        this.db[nextId] = journals[0]

        return Promise.resolve([nextId])
    }

    async readLastNPasswords(adminId: number, n: number): Promise<internal.AdminPasswordJournal[]> {
        const journals = Object.values(this.db).filter(journal => journal.admin_id === adminId)
        return journals.slice(-n)
    }

    private getNextId(): number {
        const keys = Object.keys(this.db)
        return (+keys[keys.length - 1]) + 1
    }
}
