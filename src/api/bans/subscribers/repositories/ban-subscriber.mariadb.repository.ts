import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {BanSubscriberSearchDto} from '~/api/bans/subscribers/dto/ban-subscriber-search.dto'
import {BanSubscriberOptions} from '~/api/bans/subscribers/interfaces/ban-subscriber-options.interface'
import {BanSubscriberRepository} from '~/api/bans/subscribers/interfaces/ban-subscriber.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class BanSubscriberMariadbRepository extends MariaDbRepository implements BanSubscriberRepository {
    private readonly log = new LoggerService(BanSubscriberMariadbRepository.name)

    constructor(
    ) {
        super()
    }

    async readAll(options: BanSubscriberOptions, sr: ServiceRequest): Promise<[internal.BanSubscriber[], number]> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pSubscriber')
        qb.where('ban_increment_stage > 0')
        qb.leftJoinAndSelect('pSubscriber.billing_voip_subscriber', 'bSubscriber')
        const searchDto = new BanSubscriberSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (subscriber) => subscriber.toInternalBanSubscriber())), totalCount]
    }

    async readById(id: number, options: BanSubscriberOptions, _sr: ServiceRequest): Promise<internal.BanSubscriber> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pSubscriber')
        qb.where('ban_increment_stage > 0')
        qb.leftJoinAndSelect('pSubscriber.billing_voip_subscriber', 'bSubscriber')
        qb.andWhere('bSubscriber.id = :id', {id: id})
        this.addFilterBy(qb, options.filterBy)
        const subscriber = await qb.getOneOrFail()
        return subscriber.toInternalBanSubscriber()
    }

    async readWhereInIds(ids: number[], options:BanSubscriberOptions, sr: ServiceRequest): Promise<internal.BanSubscriber[]> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pSubscriber')
        qb.where('ban_increment_stage > 0')
        qb.leftJoinAndSelect('pSubscriber.billing_voip_subscriber', 'bSubscriber')
        const searchDto = new BanSubscriberSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.andWhere('bSubscriber.id IN (:ids)', {ids: ids})
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternalBanSubscriber()))
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, filterBy: BanSubscriberOptions['filterBy']): void {
        qb.leftJoinAndSelect('pSubscriber.contract', 'contract')
        qb.leftJoinAndSelect('contract.contact', 'contact')
        if (filterBy) {
            if (filterBy.ids && filterBy.ids.length > 0) {
                qb.andWhere('bSubscriber.id IN (:ids)', {ids: filterBy.ids})
            }
            if (filterBy.customerId) {
                qb.andWhere('pSubscriber.contract_id = :customerId', {customerId: filterBy.customerId})
            }
            if (filterBy.resellerId) {
                qb.andWhere('contact.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
        }
    }
}
