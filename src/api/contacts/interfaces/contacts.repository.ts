import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface ContactsRepository {
    create(entity: internal.Contact, sr: ServiceRequest): Promise<internal.Contact>

    delete(id: number, sr: ServiceRequest): Promise<number>

    terminate(id: number, sr: ServiceRequest): Promise<number>

    readContactById(id: number, sr: ServiceRequest): Promise<internal.Contact>

    readCustomerContactById(id: number, sr: ServiceRequest): Promise<internal.Contact>

    readResellerById(id: number, sr: ServiceRequest): Promise<internal.Reseller>

    hasContactActiveContract(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactTerminatedContract(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactActiveSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean>

    hasContactTerminatedSubscriber(contactId: number, sr: ServiceRequest): Promise<boolean>

    readSystemContactById(id: number, sr: ServiceRequest): Promise<internal.Contact>

    readAllContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]>

    readAllCustomerContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]>

    readAllSystemContacts(sr: ServiceRequest): Promise<[internal.Contact[], number]>

    update(id: number, contact: internal.Contact, sr: ServiceRequest): Promise<internal.Contact>
}