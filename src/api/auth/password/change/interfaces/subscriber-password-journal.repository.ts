import {ServiceRequest} from '~/interfaces/service-request.interface'
import {internal} from '~/entities'

export interface SubscriberPasswordJournalRepository {
    create(journals: internal.SubscriberWebPasswordJournal[], sr: ServiceRequest): Promise<number[]>
    readLastNPasswords(adminId: number, n: number, sr: ServiceRequest): Promise<internal.SubscriberWebPasswordJournal[]>
    keepLastNPasswords(adminId: number, n: number, sr: ServiceRequest): Promise<void>
}