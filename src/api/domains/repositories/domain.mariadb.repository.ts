import {Injectable} from '@nestjs/common'
import {MariaDbRepository} from 'repositories/mariadb.repository'
import {In, SelectQueryBuilder} from 'typeorm'

import {DomainSearchDto} from '~/api/domains/dto/domain-search.dto'
import {DomainRepository} from '~/api/domains/interfaces/domain.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



@Injectable()
export class DomainMariadbRepository extends MariaDbRepository implements DomainRepository {
    private readonly log = new LoggerService(DomainMariadbRepository.name)

    async create(domains: internal.Domain[], _sr: ServiceRequest): Promise<number[]> {
        // billing
        const qbBilling = db.billing.Domain.createQueryBuilder('domain')
        const valuesBilling = domains.map(domain => new db.billing.Domain().fromInternal(domain))
        const resultBilling = await qbBilling.insert().values(valuesBilling).execute()

        // provisioning
        const qbProvisioning = db.provisioning.VoipDomain.createQueryBuilder('domain')
        const valuesProvisioning = domains.map(domain => new db.provisioning.VoipDomain().fromInternal(domain))
        await qbProvisioning.insert().values(valuesProvisioning).execute()

        return resultBilling.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = await this.createBaseQueryBuilder(sr)
        const searchDto = new DomainSearchDto()
        configureQueryBuilder(
            queryBuilder,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(d => d.toInternal()), totalCount]
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Domain[]> {
        const qb = await this.createBaseQueryBuilder(sr)
        const created = await qb.andWhereInIds(ids).getMany()
        return await mapYield(created, (domain) => domain.toInternal())
    }

    async readById(id: number, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by ID',
            func: this.readById.name,
            user: sr.user.username,
        })
        const qb = await this.createBaseQueryBuilder(sr)
        qb.andWhere('domain.id = :id', {id: id})
        return (await qb.getOneOrFail()).toInternal()
    }

    // names of `names` that exist as domains, as stored
    async readExistingNames(names: string[]): Promise<string[]> {
        if (!names.length)
            return []
        const domains = await db.billing.Domain.find({select: {domain: true}, where: {domain: In(names)}})
        return domains.map(domain => domain.domain)
    }

    // ids of `ids` that are resellers, unset ids are left out
    async readExistingResellerIds(ids: number[]): Promise<number[]> {
        const resellerIds = ids.filter(id => id != null)
        if (!resellerIds.length)
            return []
        const resellers = await db.billing.Reseller.find({select: {id: true}, where: {id: In(resellerIds)}})
        return resellers.map(reseller => reseller.id)
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        const domains = await db.billing.Domain.find({select: {domain: true}, where: {id: In(ids)}})
        const names = domains.map(domain => domain.domain)
        await db.billing.Domain.delete(ids)
        // MariaDB runs no triggers for FK cascades, so the aliases are deleted before their domains
        // and their trigger removes the kamailio.dbaliases entries
        const provisioningDomains = await db.provisioning.VoipDomain.find({select: {id: true}, where: {domain: In(names)}})
        if (provisioningDomains.length)
            await db.provisioning.VoipDBAlias.delete({domain_id: In(provisioningDomains.map(domain => domain.id))})
        await db.provisioning.VoipDomain.delete({domain: In(names)})
        return ids
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Domain>> {
        const qb = db.billing.Domain.createQueryBuilder('domain')
        if (sr.user.reseller_id_required)
            qb.andWhere('domain.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
        return Promise.resolve(qb)
    }
}
