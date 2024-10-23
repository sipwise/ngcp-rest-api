import {ServiceRequest} from '~/interfaces/service-request.interface'
import {internal} from '~/entities'

export interface AdminPasswordJournalRepository {
    create(journals: internal.AdminPasswordJournal[], sr: ServiceRequest): Promise<number[]>
    readLastNPasswords(adminId: number, n: number, sr: ServiceRequest): Promise<internal.AdminPasswordJournal[]>
    keepLastNPasswords(adminId: number, n: number, sr: ServiceRequest): Promise<void>
}