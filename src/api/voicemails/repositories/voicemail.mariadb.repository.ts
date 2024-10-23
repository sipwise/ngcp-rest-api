import {ServiceRequest} from '~/interfaces/service-request.interface'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {SelectQueryBuilder} from 'typeorm'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {VoicemailSearchDto} from '~/api/voicemails/dto/voicemail-search.dto'
import {VoicemailRepository} from '~/api/voicemails/interfaces/voicemail.repository'
import {LoggerService} from '~/logger/logger.service'
import {Dictionary} from '~/helpers/dictionary.helper'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export class MessagesCount {
    new_messages: number
    old_messages: number

    constructor(new_m: number = 0, old_m: number = 0) {
        this.new_messages = new_m
        this.old_messages = old_m
    }
}

export class VoicemailMariadbRepository extends MariaDbRepository implements VoicemailRepository {
    private readonly log = new LoggerService(VoicemailMariadbRepository.name)

    async readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        const qb = await this.createBaseQueryBuilder(sr)
        const searchDto = new VoicemailSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        const [result, count] = await qb.getManyAndCount()
        return [result.map(voicemail => voicemail.toInternal()), count]
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.where('voicemail.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Voicemail[]> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.whereInIds(ids)
        const voicemails = await qb.getMany()
        return await Promise.all(voicemails.map(async (voicemail) => voicemail.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest): Promise<number> {
        const qb = await this.createBaseQueryBuilder(sr)
        return await qb.whereInIds(ids).getCount()
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.kamailio.VoicemailSpool.delete(ids)
        return ids
    }

    async update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({message: 'update voicemail by id', func: this.update.name, user: sr.user.username, ids: ids})
        for (const id of ids) {
            const update = new db.kamailio.VoicemailSpool().fromInternal(updates[id])
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            await db.kamailio.VoicemailSpool.update(id, update)
        }
        return ids
    }

    async readMessagesCountByUUID(uuid: string, _sr: ServiceRequest): Promise<MessagesCount> {
        const qb = db.kamailio.VoicemailSpool.createQueryBuilder('v')
        qb.select(['v.dir as dir', 'COUNT(v.dir) as dir_count'])
        qb.where('v.mailboxuser = :uuid', {uuid: uuid})
        qb.groupBy('v.dir')
        const result = await qb.getRawMany()
        const mCount = new MessagesCount()
        result.map(async (entry) => {
            const dir = entry['dir']
            const dir_count = entry['dir_count']
            if (dir.endsWith('INBOX'))
                mCount.new_messages = dir_count
            else if (dir.endsWith('Old'))
                mCount.old_messages = dir_count
        })
        return mCount
    }

    private async createBaseQueryBuilder(_sr: ServiceRequest): Promise<SelectQueryBuilder<db.kamailio.VoicemailSpool>> {
        const qb = db.kamailio.VoicemailSpool.createQueryBuilder('voicemail')
        qb.leftJoinAndSelect('voicemail.billingSubscriber', 'bSubscriber')
        qb.leftJoinAndSelect('voicemail.provisioningSubscriber', 'pSubscriber')
        return qb
    }
}