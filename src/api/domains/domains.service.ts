import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainBaseDto} from './dto/domain-base.dto'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainUpdateDto} from './dto/domain-update.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {handleSequelizeError} from '../../helpers/errors.helper'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {AppService} from 'app.sevice'
import {db} from 'entities'

@Injectable()
export class DomainsService implements CrudService<DomainCreateDto, DomainResponseDto> {
    constructor(
        private readonly app: AppService
    ) {
    }

    private inflate(dto: DomainBaseDto): db.billing.Domain {
        return Object.assign(dto)
}

    private deflate(entry: db.billing.Domain): DomainBaseDto {
            return Object.assign(entry)
    }

    private toResponse(db: db.billing.Domain): DomainResponseDto {
        return {
            domain: db.domain,
            id: db.id,
            reseller_id: null,
        }
    }

    async create(domain: DomainCreateDto): Promise<DomainResponseDto> {
        const dbDomain = db.billing.Domain.create(domain)
        try {
            await db.billing.Domain.insert(dbDomain)
            return this.toResponse(dbDomain)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async readAll(page: string, rows: string): Promise<DomainResponseDto[]> {
        try {
            const result = await db.billing.Domain.find(
                {take: +rows, skip: +rows * (+page - 1)}
            )
            return result.map(d => this.toResponse(d))
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async read(id: number): Promise<DomainResponseDto> {
        let entry: db.billing.Domain
        try {
            entry = await db.billing.Domain.findOne(id)
        } catch (err) {
            throw new BadRequestException(err)
        }

        if (!entry)
        throw new NotFoundException()

        try {
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async update(id: number, domain: DomainUpdateDto): Promise<DomainResponseDto> {
        let entry: db.billing.Domain
        try {
            entry = await db.billing.Domain.findOne(id)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
        throw new NotFoundException()

        try {
            entry = db.billing.Domain.merge(entry, domain)
            db.billing.Domain.update(entry.id, entry)
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async adjust(id: number, patch: PatchOperation[]): Promise<DomainResponseDto> {
        let entry: db.billing.Domain
        let domain: DomainBaseDto

        try {
            entry = await db.billing.Domain.findOne(id)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
        throw new NotFoundException()

        try {
            domain = this.deflate(entry)
            domain = applyPatch(domain, patch).newDocument
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        try {
            entry = db.billing.Domain.merge(entry, this.inflate(domain))
            db.billing.Domain.update(entry.id, entry)
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async delete(id: number): Promise<number> {
        try {
            db.billing.Domain.delete(id)
            return 1
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }
}
