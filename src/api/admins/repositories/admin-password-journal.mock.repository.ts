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

    create(journals: internal.AdminPasswordJournal[]): Promise<number[]> {
        const ids = journals.map(journal => {
            journal.id = this.getNextId()
            this.db[journal.id] = journal
            return journal.id
        })
        return Promise.resolve(ids)
    }

    readByAdminIds(adminIds: number[]): Promise<internal.AdminPasswordJournal[]> {
        const journals: internal.AdminPasswordJournal[] = Object.values(this.db).filter(journal => adminIds.includes(journal.admin_id))
        return Promise.resolve(journals.reverse())
    }

    delete(ids: number[]): Promise<void> {
        ids.forEach(id => delete this.db[id])
        return Promise.resolve()
    }

    private getNextId(): number {
        const keys = Object.keys(this.db)
        return (+keys[keys.length - 1]) + 1
    }
}
