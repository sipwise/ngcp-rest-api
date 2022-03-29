import {Injectable, InternalServerErrorException, Logger, NotImplementedException} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {TelnetDispatcher} from '../../../helpers/telnet-dispatcher'
import {XmlDispatcher} from '../../../helpers/xml-dispatcher'
import {DomainSearchDto} from '../dto/domain-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'

@Injectable()
export class DomainsMariadbRepository {
    private readonly log = new Logger(DomainsMariadbRepository.name)

    @HandleDbErrors
    async create(domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain> {
        const dbDomain = db.billing.Domain.create(domain)
        const dbVoipDomain = db.provisioning.VoipDomain.create(domain)

        await db.billing.Domain.insert(dbDomain)
        await db.provisioning.VoipDomain.insert(dbVoipDomain)

        const telnetDispatcher = new TelnetDispatcher()
        const xmlDispatcher = new XmlDispatcher()

        const errors = await telnetDispatcher.activateDomain(dbDomain.domain)

        // roll back changes if errors occured TODO: replace with transaction when we support them
        if (errors.length > 0) {
            await telnetDispatcher.deactivateDomain(dbDomain.domain)
            await db.billing.Domain.remove(dbDomain)
            await db.provisioning.VoipDomain.remove(dbVoipDomain)
            throw new InternalServerErrorException(errors)
        }
        await xmlDispatcher.sipDomainReload(dbDomain.domain)
        return dbDomain.toInternal()
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<internal.Domain[]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })
        const queryBuilder = db.billing.Domain.createQueryBuilder('domain')
        const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
        await configureQueryBuilder(queryBuilder, req.query,
            {where: domainSearchDtoKeys, rows: +rows, page: +page})
        const result = await queryBuilder.getMany()
        return result.map(d => d.toInternal())
    }

    @HandleDbErrors
    async readById(id: number, req: ServiceRequest): Promise<internal.Domain> {
        return (await db.billing.Domain.findOneOrFail(id)).toInternal()
    }

    @HandleDbErrors
    async readByDomain(domain: string, req: ServiceRequest): Promise<internal.Domain> {
        return (await db.billing.Domain.findOne({where: {domain: domain}})).toInternal()
    }

    @HandleDbErrors
    async update(id: number, domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const domain = await db.billing.Domain.findOneOrFail(id)
        await db.billing.Domain.delete(id)

        const provDomain = await db.provisioning.VoipDomain.findOneOrFail({where: {domain: domain.domain}})
        await db.provisioning.VoipDomain.delete(provDomain.id)

        const telnetDispatcher = new TelnetDispatcher()
        const xmlDispatcher = new XmlDispatcher()

        await telnetDispatcher.deactivateDomain(domain.domain)
        await xmlDispatcher.sipDomainReload(domain.domain)
        return 1
    }
}
