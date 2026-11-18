import {Injectable} from '@nestjs/common'
import {In, IsNull, SelectQueryBuilder} from 'typeorm'

import {ResellerSearchDto} from '~/api/resellers/dto/reseller-search.dto'
import {ResellerContract, ResellerRepository} from '~/api/resellers/interfaces/reseller.repository'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

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
        const resellerIds = Array.isArray(resellerId) ? resellerId : [resellerId]
        const templates = resellerIds.flatMap(id => defaultTemplates.map(template => {
            const copy = db.billing.EmailTemplate.create({...template, reseller_id: id})
            delete copy.id
            return copy
        }))
        if (templates.length)
            await db.billing.EmailTemplate.insert(templates)
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
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async terminate(id: number, _sr: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete reseller by id', func: this.terminate.name, id: id})
        let reseller = await db.billing.Reseller.findOneByOrFail({id: id})
        reseller = db.billing.Reseller.merge(reseller, {status: ResellerStatus.Terminated})
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
        return await mapYield(created, (reseller) => reseller.toInternal())
    }


    async readByNames(names: string[]): Promise<internal.Reseller[]> {
        if (!names.length)
            return []
        const resellers = await db.billing.Reseller.findBy({name: In(names)})
        return await mapYield(resellers, reseller => reseller.toInternal())
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

    async readResellerContracts(contractIds: number[]): Promise<ResellerContract[]> {
        if (!contractIds.length)
            return []
        const rows = await db.billing.Contract.createQueryBuilder('contract')
            .leftJoin('contract.contact', 'contact')
            .leftJoin(db.billing.Reseller, 'reseller', 'reseller.contract_id = contract.id')
            .select('contract.id', 'id')
            .addSelect('contact.id IS NOT NULL AND contact.reseller_id IS NULL', 'hasSystemContact')
            .addSelect('reseller.id IS NOT NULL', 'hasReseller')
            .where('contract.id IN (:...ids)', {ids: contractIds})
            .getRawMany<{id: number, hasSystemContact: number, hasReseller: number}>()
        return rows.map(row => ({id: row.id, hasSystemContact: row.hasSystemContact == 1, hasReseller: row.hasReseller == 1}))
    }

    async renameResellers(ids: number[]): Promise<void> {
        await db.billing.Reseller.createQueryBuilder()
            .update()
            .set({name: () => 'CONCAT(\'old_\', id, \'_\', name)'})
            .whereInIds(ids)
            .execute()
    }

    private createBaseQueryBuilder(_sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        return Promise.resolve(qb)
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = await this.createBaseQueryBuilder(sr)
        const searchDto = new ResellerSearchDto()
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
        return qb
    }
}
