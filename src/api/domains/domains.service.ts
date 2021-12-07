import {AppService} from '../../app.service'
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotImplementedException,
    UnprocessableEntityException,
} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainBaseDto} from './dto/domain-base.dto'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainUpdateDto} from './dto/domain-update.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RBAC_ROLES} from '../../config/constants.config'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import {DomainSearchDto} from './dto/domain-search.dto'
import {XmlDispatcher} from '../../helpers/xml-dispatcher'
import {TelnetDispatcher} from '../../helpers/telnet-dispatcher'

@Injectable()
export class DomainsService implements CrudService<DomainCreateDto, DomainResponseDto> {
    private readonly log = new Logger(DomainsService.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    toResponse(db: db.billing.Domain): DomainResponseDto {
        return {
            domain: db.domain,
            id: db.id,
            reseller_id: db.reseller_id,
        }
    }

    @HandleDbErrors
    async create(domain: DomainCreateDto, req: ServiceRequest): Promise<DomainResponseDto> {
        if (RBAC_ROLES.reseller == req.user.role) {
            domain.reseller_id = req.user.reseller_id
        }
        // check if reseller exists
        await db.billing.Reseller.findOneOrFail(domain.reseller_id)
        const result = await db.billing.Domain.findOne({where: {domain: domain.domain}})
        if (!result == undefined) {
            throw new UnprocessableEntityException(`domain ${domain.domain} already exists`)
        }

        const dbDomain = db.billing.Domain.create(domain)
        const dbVoipDomain = db.provisioning.VoipDomain.create(domain)

        await db.billing.Domain.insert(dbDomain)
        await db.provisioning.VoipDomain.insert(dbVoipDomain)

        let telnetDispatcher = new TelnetDispatcher()
        let xmlDispatcher = new XmlDispatcher()

        let errors = await telnetDispatcher.activateDomain(dbDomain.domain)

        // roll back changes if errors occured
        if (errors.length > 0) {
            await telnetDispatcher.deactivateDomain(dbDomain.domain)
            await db.billing.Domain.remove(dbDomain)
            await db.provisioning.VoipDomain.remove(dbVoipDomain)
            throw new InternalServerErrorException(errors)
        }
        await xmlDispatcher.sipDomainReload(dbDomain.domain)
        return this.toResponse(dbDomain)
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<DomainResponseDto[]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })
        let queryBuilder = db.billing.Domain.createQueryBuilder("domain")
        let domainSearchDtoKeys = Object.keys(new DomainSearchDto())
        await configureQueryBuilder(queryBuilder, req.query,
            {where: domainSearchDtoKeys, rows: +rows, page: +page})
        const result = await queryBuilder.getMany()
        return result.map(d => this.toResponse(d))
    }

    @HandleDbErrors
    async read(id: number): Promise<DomainResponseDto> {
        return this.toResponse(await db.billing.Domain.findOneOrFail(id))
    }

    @HandleDbErrors
    async update(id: number, domain: DomainUpdateDto): Promise<DomainResponseDto> {
        throw new NotImplementedException()
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation | PatchOperation[]): Promise<DomainResponseDto> {
        throw new NotImplementedException()
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const domain = await db.billing.Domain.findOneOrFail(id)
        if (RBAC_ROLES.reseller == req.user.role && domain.reseller_id != req.user.reseller_id) {
            throw new ForbiddenException('domain does not belong to reseller')
        }
        const provDomain = await db.provisioning.VoipDomain.findOneOrFail({where: {domain: domain.domain}})
        await db.billing.Domain.delete(id)
        await db.provisioning.VoipDomain.delete(provDomain.id)
        let telnetDispatcher = new TelnetDispatcher()

        let xmlDispatcher = new XmlDispatcher()
        await telnetDispatcher.deactivateDomain(domain.domain)
        await xmlDispatcher.sipDomainReload(domain.domain)
        return 1
    }

    private inflate(dto: DomainBaseDto): db.billing.Domain {
        return db.billing.Domain.create(dto)
    }

    private deflate(entry: db.billing.Domain): DomainBaseDto {
        return Object.assign(entry)
    }
}
