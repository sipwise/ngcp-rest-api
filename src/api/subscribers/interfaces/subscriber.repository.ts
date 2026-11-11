import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

/**
 * Subscribers a read is limited to, set by the service from the caller's role; empty = all subscribers
 */
export interface SubscriberScope {
    resellerId?: number
    customerId?: number
    subscriberId?: number
}

export interface SubscriberRepository {
    readAll(sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]>

    readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined>

    readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]>
}
