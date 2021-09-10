import {AppService} from '../../app.service'
import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainBaseDto} from './dto/domain-base.dto'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainUpdateDto} from './dto/domain-update.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {db} from '../../entities'

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
            reseller_id: null,
        }
    }

    @HandleDbErrors
    async create(domain: DomainCreateDto): Promise<DomainResponseDto> {
        const dbDomain = db.billing.Domain.create(domain)

        await db.billing.Domain.insert(dbDomain)
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
        let entry = await db.billing.Domain.findOneOrFail(id)

        entry = db.billing.Domain.merge(entry, domain)
        db.billing.Domain.update(entry.id, entry)
        return this.toResponse(entry)
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation[]): Promise<DomainResponseDto> {
        let domain: DomainBaseDto
        let entry = await db.billing.Domain.findOneOrFail(id)

        domain = this.deflate(entry)
        domain = applyPatch(domain, patch).newDocument

        entry = db.billing.Domain.merge(entry, this.inflate(domain))
        db.billing.Domain.update(entry.id, entry)
        return this.toResponse(entry)
    }

    @HandleDbErrors
    async delete(id: number): Promise<number> {
        await db.billing.Domain.findOneOrFail(id)

        await db.billing.Domain.delete(id)
        return 1
    }

    private inflate(dto: DomainBaseDto): db.billing.Domain {
        return db.billing.Domain.create(dto)
    }

    private deflate(entry: db.billing.Domain): DomainBaseDto {
        return Object.assign(entry)
    }
}
