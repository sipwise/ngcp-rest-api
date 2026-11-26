import {internal} from '~/entities'

export interface AdminPasswordJournalRepository {
    create(journals: internal.AdminPasswordJournal[]): Promise<number[]>
    readByAdminIds(adminIds: number[]): Promise<internal.AdminPasswordJournal[]>
    delete(ids: number[]): Promise<void>
}
