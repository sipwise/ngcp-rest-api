import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {SelectQueryBuilder} from 'typeorm'
import {db, internal} from '../../../entities'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {VoicemailSearchDto} from '../dto/voicemail-search.dto'
import {VoicemailRepository} from '../interfaces/voicemail.repository'
import {LoggerService} from '../../../logger/logger.service'
import {Dictionary} from '../../../helpers/dictionary.helper'

export class MessagesCount {
    new_messages: number
    old_messages: number

    constructor(new_m: number = 0, old_m: number = 0) {
        this.new_messages = new_m
        this.old_messages = old_m
    }
}

export class VoicemailMariadbRepository implements VoicemailRepository {
    private readonly log = new LoggerService(VoicemailMariadbRepository.name)

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        const qb = await this.createReadAllQueryBuilder(sr)
        const [result, count] = await qb.getManyAndCount()
        return [result.map(voicemail => voicemail.toInternal()), count]
    }

    @HandleDbErrors
    async read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.where('voicemail.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    @HandleDbErrors
    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Voicemail[]> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.whereInIds(ids)
        const voicemails = await qb.getMany()

        return await Promise.all(voicemails.map(async (voicemail) => voicemail.toInternal()))
    }

    @HandleDbErrors
    async readCountOfIds(ids: number[], sr: ServiceRequest): Promise<number> {
        const qb = await this.createBaseQueryBuilder(sr)
        return await qb.whereInIds(ids).getCount()
    }

    @HandleDbErrors
    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        await db.kamailio.VoicemailSpool.delete(ids)
        return ids
    }

    @HandleDbErrors
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

    @HandleDbErrors
    async readMessagesCountByUUID(uuid: string, sr: ServiceRequest): Promise<MessagesCount> {
        const qb = db.kamailio.VoicemailSpool.createQueryBuilder('v')
        qb.select(['v.dir as dir', 'COUNT(v.dir) as dir_count'])
        qb.where('v.mailboxuser = :uuid', {uuid: uuid})
        qb.groupBy('v.dir')
        const result = await qb.getRawMany()
        const mCount = new MessagesCount()
        result.map(async (entry) => {
            this.log.debug(entry)
            const dir = entry['dir']
            const dir_count = entry['dir_count']
            this.log.debug(dir, dir_count)
            if (dir.endsWith('INBOX'))
                mCount.new_messages = dir_count
            else if (dir.endsWith('Old'))
                mCount.old_messages = dir_count
        })
        return mCount
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.kamailio.VoicemailSpool>> {
        const qb = db.kamailio.VoicemailSpool.createQueryBuilder('voicemail')
        qb.leftJoinAndSelect('voicemail.billingSubscriber', 'bSubscriber')
        qb.leftJoinAndSelect('voicemail.provisioningSubscriber', 'pSubscriber')
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.kamailio.VoicemailSpool>> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new VoicemailSearchDto())))
        return qb
    }
}