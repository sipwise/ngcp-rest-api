import {BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common'
import {Domain, DomainAttributes} from '../../entities/db/billing/domain.entity'
import {DOMAIN_REPOSITORY} from '../../config/constants.config'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainBaseDto} from './dto/domain-base.dto'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainUpdateDto} from './dto/domain-update.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {handleSequelizeError} from '../../helpers/errors.helper'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'

@Injectable()
export class DomainsService implements CrudService<DomainCreateDto, DomainResponseDto> {
    constructor(
        @Inject(DOMAIN_REPOSITORY) private readonly domainsRepo: typeof Domain,
    ) {
    }

    private inflate(dto: DomainBaseDto): Domain {
        return Object.assign(dto)
}

    private deflate(entry: Domain): DomainBaseDto {
            return Object.assign(entry)
    }

    private toResponse(db: Domain): DomainResponseDto {
        return {
            domain: db.domain,
            id: db.id,
            reseller_id: null,
        }
    }

    async create(domain: DomainCreateDto): Promise<DomainResponseDto> {
        const dbDomain: DomainAttributes = {
            domain: domain.domain,
        }
        try {
            return this.toResponse(await this.domainsRepo.create<Domain>(dbDomain))
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }

    async delete(id: number): Promise<number> {
        try {
            return this.domainsRepo.destroy({where: {id}})
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }

    async readAll(page: string, rows: string): Promise<DomainResponseDto[]> {
        try {
            const result = await this.domainsRepo.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
            return result.rows.map(d => this.toResponse(d))
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }

    async read(id: number): Promise<DomainResponseDto> {
        let entry: Domain
        try {
            entry = await this.domainsRepo.findOne<Domain>({ where: { id } })
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
            throw new NotFoundException()

        try {
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async update(id: number, domain: DomainUpdateDto): Promise<DomainResponseDto> {
        let entry: Domain
        try {
            entry = await this.domainsRepo.findByPk(id)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
            throw new NotFoundException()

        try {
            entry.set(domain)
            entry.save()
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async adjust(id: number, patch: PatchOperation[]): Promise<DomainResponseDto> {
        let entry: Domain
        let domain: DomainBaseDto

        try {
            entry = await this.domainsRepo.findByPk(id)
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
            entry.set(this.inflate(domain))
            entry.save()
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }
}
