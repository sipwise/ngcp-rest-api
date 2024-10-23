import {Injectable} from '@nestjs/common'
import {AppService} from '../../../app.service'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ResellerSearchDto} from '../dto/reseller-search.dto'
import {IsNull, SelectQueryBuilder} from 'typeorm'
import {db, internal} from '../../../entities'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {ResellerRepository} from '../interfaces/reseller.repository'
import {LoggerService} from '../../../logger/logger.service'
import {Dictionary} from '../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../repositories/mariadb.repository'

@Injectable()
export class ResellerMariadbRepository extends MariaDbRepository implements ResellerRepository {
    private readonly log = new LoggerService(ResellerMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
        super()
    }

    async createEmailTemplates(resellerId: number | number[]): Promise<void> {
        this.log.debug({
            message: 'create email templates',
            func: this.createEmailTemplates.name,
            resellerId: resellerId,
        })
        const defaultTemplates = await this.findDefaultEmailTemplates()
        defaultTemplates.forEach(template => {
            delete template.id
            if (Array.isArray(resellerId)) {
                for (const number of resellerId) {
                    template.reseller_id = number
                    db.billing.EmailTemplate.insert(template)
                }
            } else {
                template.reseller_id = resellerId
                db.billing.EmailTemplate.insert(template)
            }
        })
    }

    async findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]> {
        return await db.billing.EmailTemplate.find(
            {
                where: {
                    reseller_id: IsNull(),
                },
            },
        )
    }

    async create(resellers: internal.Reseller[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        const values = resellers.map(reseller => new db.billing.Reseller().fromInternal(reseller))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map(obj => obj.id)
    }

    async terminate(id: number, _sr: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete reseller by id', func: this.terminate.name, id: id})
        let reseller = await db.billing.Reseller.findOneByOrFail({id: id})
        reseller = await db.billing.Reseller.merge(reseller, {status: ResellerStatus.Terminated})
        await db.billing.Reseller.update(reseller.id, reseller)
        return 1
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.read.name, user: sr.user.username, id: id})
        return (await db.billing.Reseller.findOneByOrFail({id: id})).toInternal()
    }

    async readWhereInIds(ids: number[]): Promise<internal.Reseller[]> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async (reseller) => reseller.toInternal()))
    }

    async readCountOfIds(ids: number[]): Promise<number> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        return await qb.andWhereInIds(ids).getCount()
    }

    async readByName(name: string, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.readByName.name, user: sr.user.username, name: name})
        return await db.billing.Reseller.findOne({where: {name: name}})
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        this.log.debug({
            message: 'read all resellers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = await this.createReadAllQueryBuilder(sr)

        const [result, count] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    async update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({message: 'update reseller by id', func: this.update.name, user: sr.user.username, ids: ids})
        for (const id of ids) {
            const reseller = updates[id]
            const update = new db.billing.Reseller().fromInternal(reseller)
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            await db.billing.Reseller.update(id, update)
        }
        return ids
    }

    async resellerWithContractExists(contractId: number): Promise<boolean> {
        const resellers = await db.billing.Reseller.find({where: {contract_id: contractId}})
        return resellers.length != 0
    }

    async contractExists(contractId: number): Promise<boolean> {
        const contract = await db.billing.Contract.findOneBy({id: contractId})
        return contract != undefined
    }

    async contractHasSystemContact(contractId: number): Promise<boolean> {
        const contract = await db.billing.Contract.findOne({
            where: {
                id: contractId,
            },
            relations: ['contact'],
        })
        return contract.contact.reseller_id == undefined
    }

    async renameReseller(id: number, name: string): Promise<void> {
        await db.billing.Reseller.update(id, {name: `old_${id}_${name}`})
    }

    private async createBaseQueryBuilder(_sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new ResellerSearchDto())))
        return qb
    }
}
