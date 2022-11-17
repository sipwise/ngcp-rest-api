import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {SelectQueryBuilder} from 'typeorm'
import {db, internal} from '../../../entities'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {VoicemailSearchDto} from '../dto/voicemail-search.dto'
import {VoicemailRepository} from '../interfaces/voicemail.repository'
import {LoggerService} from '../../../logger/logger.service'

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
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        const toDelete = await db.kamailio.VoicemailSpool.findOneByOrFail({ id: id })
        await db.kamailio.VoicemailSpool.remove(toDelete)
        return 1
    }

    @HandleDbErrors
    async update(id: number, voicemail: internal.Voicemail, sr: ServiceRequest): Promise<internal.Voicemail> {
        this.log.debug({message: 'update voicemail by id', func: this.update.name, user: sr.user.username, id: id})
        const update = new db.kamailio.VoicemailSpool().fromInternal(voicemail)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.kamailio.VoicemailSpool.update(id, update)
        return await this.read(id, sr)
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.kamailio.VoicemailSpool>> {
        const qb = db.kamailio.VoicemailSpool.createQueryBuilder('voicemail')
        qb.leftJoinAndSelect('voicemail.billingSubscriber', 'subscriber')
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.kamailio.VoicemailSpool>> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new VoicemailSearchDto())))
        return qb
    }
}