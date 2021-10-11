import {AppService} from '../../app.service'
import {ForbiddenException, Injectable, NotImplementedException, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainBaseDto} from './dto/domain-base.dto'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainUpdateDto} from './dto/domain-update.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Operation as PatchOperation} from 'fast-json-patch'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RBAC_ROLES} from '../../config/constants.config'

@Injectable()
export class DomainsService implements CrudService<DomainCreateDto, DomainResponseDto> {
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

        // TODO: xmpp domain reload
        // TODO: sip domain reload
        return this.toResponse(dbDomain)
    }

    @HandleDbErrors
    async readAll(page: number, rows: number): Promise<DomainResponseDto[]> {
        const result = await db.billing.Domain.find(
            {take: rows, skip: rows * (page - 1)},
        )
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
    async adjust(id: number, patch: PatchOperation[]): Promise<DomainResponseDto> {
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
        return 1
    }

    private inflate(dto: DomainBaseDto): db.billing.Domain {
        return db.billing.Domain.create(dto)
    }

    private deflate(entry: db.billing.Domain): DomainBaseDto {
        return Object.assign(entry)
    }
}
