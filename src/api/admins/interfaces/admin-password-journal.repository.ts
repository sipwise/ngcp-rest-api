import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface AdminPasswordJournalRepository {
    create(journals: internal.AdminPasswordJournal[]): Promise<number[]>
    readLastNPasswords(adminId: number, n: number): Promise<internal.AdminPasswordJournal[]>
    keepLastNPasswords(adminId: number, n: number): Promise<void>
}