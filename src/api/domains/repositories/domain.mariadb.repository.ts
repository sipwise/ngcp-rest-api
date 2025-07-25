import {Injectable, InternalServerErrorException} from '@nestjs/common'
import {MariaDbRepository} from 'repositories/mariadb.repository'

import {DomainSearchDto} from '~/api/domains/dto/domain-search.dto'
import {DomainRepository} from '~/api/domains/interfaces/domain.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {TelnetDispatcher} from '~/helpers/telnet-dispatcher'
import {XmlDispatcher} from '~/helpers/xml-dispatcher'
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

        const telnetDispatcher = new TelnetDispatcher()
        const xmlDispatcher = new XmlDispatcher()

        for (const domain of domains) {
            const errors = await telnetDispatcher.activateDomain(domain.domain)

            // roll back changes if errors occurred
            if (errors.length > 0) {
                await telnetDispatcher.deactivateDomain(domain.domain)
                await db.billing.Domain.remove(new db.billing.Domain().fromInternal(domain))
                await db.provisioning.VoipDomain.remove(new db.provisioning.VoipDomain().fromInternal(domain))
                throw new InternalServerErrorException(errors) // TODO: error thrown here prevents following domains from being activated
            }
            await xmlDispatcher.sipDomainReload(domain.domain)
        }

        return resultBilling.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = db.billing.Domain.createQueryBuilder('domain')
        const searchDto = new DomainSearchDto()
        await configureQueryBuilder(
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

    async readWhereInIds(ids: number[], _sr: ServiceRequest): Promise<internal.Domain[]> {
        const qb = db.billing.Domain.createQueryBuilder('domain')
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async (domain) => domain.toInternal()))
    }

    async readById(id: number, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by ID',
            func: this.readById.name,
            user: sr.user.username,
        })
        return (await db.billing.Domain.findOneByOrFail({id: id})).toInternal()
    }

    async readByDomain(domain: string, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by domain name',
            func: this.readByDomain.name,
            user: sr.user.username,
        })
        return (await db.billing.Domain.findOne({where: {domain: domain}})).toInternal()
    }

    async readResellerById(id: number, _sr: ServiceRequest): Promise<internal.Reseller> {
        const reseller = await db.billing.Reseller.findOneBy({id: id})
        if (reseller)
            return reseller.toInternal()
        return undefined
    }

    async delete(id: number, _sr: ServiceRequest): Promise<number> {
        const domain = await db.billing.Domain.findOneByOrFail({id: id})
        await db.billing.Domain.delete(id)

        const provDomain = await db.provisioning.VoipDomain.findOneOrFail({where: {domain: domain.domain}})
        await db.provisioning.VoipDomain.delete(provDomain.id)

        const telnetDispatcher = new TelnetDispatcher()
        const xmlDispatcher = new XmlDispatcher()

        await telnetDispatcher.deactivateDomain(domain.domain)
        await xmlDispatcher.sipDomainReload(domain.domain)
        return domain.id
    }
}
