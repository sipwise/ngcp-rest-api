import {SubscriberRepository, SubscriberScope} from '~/api/subscribers/interfaces/subscriber.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class SubscriberMockRepository implements SubscriberRepository {
    readonly subscriberDB: {[key: number]: internal.Subscriber} = {}

    async readAll(_sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]> {
        const rows = this.visible(scope)
        return [rows, rows.length]
    }

    async readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined> {
        return this.visible(scope).find(s => s.id == id)
    }

    async readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]> {
        return this.visible(scope).filter(s => ids.includes(s.id))
    }

    private visible(scope: SubscriberScope): internal.Subscriber[] {
        return Object.values(this.subscriberDB).filter(s =>
            (scope.resellerId == undefined || s.resellerId == scope.resellerId)
            && (scope.customerId == undefined || s.customerId == scope.customerId)
            && (scope.subscriberId == undefined || s.id == scope.subscriberId),
        )
    }
}
