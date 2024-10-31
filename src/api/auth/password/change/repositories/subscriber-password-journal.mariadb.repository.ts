import {Injectable} from '@nestjs/common'

import {SubscriberPasswordJournalRepository} from '~/api/auth/password/change/interfaces/subscriber-password-journal.repository'
import {db, internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class SubscriberPasswordJournalMariadbRepository extends MariaDbRepository implements SubscriberPasswordJournalRepository {
    private readonly log = new LoggerService(SubscriberPasswordJournalMariadbRepository.name)

    constructor(
    ) {
        super()
    }

    async create(subscribers: internal.SubscriberWebPasswordJournal[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.provisioning.VoipSubscriberWebPasswordJournal.createQueryBuilder('pass')
        const values = subscribers.map(subscriber => new db.provisioning.VoipSubscriberWebPasswordJournal().fromInternal(subscriber))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readLastNPasswords(subscriberId: number, n: number, _sr: ServiceRequest): Promise<internal.SubscriberWebPasswordJournal[]> {
        const qb = db.provisioning.VoipSubscriberWebPasswordJournal.createQueryBuilder('pass')
        qb.where('pass.subscriber_id = :subscriber_id', {subscriber_id: subscriberId})
        qb.orderBy('pass.id', 'DESC')
        qb.limit(n)
        return await qb.getMany()
    }

    async keepLastNPasswords(subscriberId: number, n: number, _sr: ServiceRequest): Promise<void> {
        const idsQb = db.provisioning.VoipSubscriberWebPasswordJournal.createQueryBuilder('pass')
            .select('pass.id')
            .where('pass.subscriber_id = :subscriber_id', {subscriber_id: subscriberId})
            .orderBy('pass.id', 'DESC')
            .limit(n)

        const ids = await idsQb.getMany()
        const lastIdToKeep = ids.pop()?.id

        if (!lastIdToKeep) {
            return
        }

        const deleteQb = db.provisioning.VoipSubscriberWebPasswordJournal.createQueryBuilder()
            .delete()
            .where('subscriber_id = :subscriber_id', {subscriber_id: subscriberId})
            .andWhere('id < :id', {id: lastIdToKeep})

        await deleteQb.execute()
    }
}
