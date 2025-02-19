import {BanSubscriberOptions} from './ban-subscriber-options.interface'

import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface BanSubscriberRepository {
    readAll(options: BanSubscriberOptions, sr: ServiceRequest): Promise<[internal.BanSubscriber[], number]>
    readById(id: number, options: BanSubscriberOptions, sr: ServiceRequest): Promise<internal.BanSubscriber>
    readWhereInIds(ids: number[], options: BanSubscriberOptions, sr: ServiceRequest): Promise<internal.BanSubscriber[]>
}