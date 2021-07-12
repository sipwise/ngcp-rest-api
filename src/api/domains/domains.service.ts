import {Inject, Injectable, InternalServerErrorException} from '@nestjs/common'
import {Domain, DomainAttributes} from '../../entities/db/billing/domain.entity'
import {DOMAIN_REPOSITORY} from '../../config/constants.config'
import {CrudService} from '../../interfaces/crud-service.interface'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {handleSequelizeError} from '../../helpers/errors.helper'

@Injectable()
export class DomainsService implements CrudService<DomainCreateDto, DomainResponseDto> {
    constructor(
        @Inject(DOMAIN_REPOSITORY) private readonly domainsRepo: typeof Domain,
    ) {
    }

    private static toResponse(db: Domain): DomainResponseDto {
        return {
            domain: db.domain,
            id: db.id,
            reseller_id: null,
        }
    }

    async create(entity: DomainCreateDto): Promise<DomainResponseDto> {
        const dbDomain: DomainAttributes = {
            domain: entity.domain,
        }
        try {
            return DomainsService.toResponse(await this.domainsRepo.create<Domain>(dbDomain))
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

    async read(id: number): Promise<DomainResponseDto> {
        try {
            return DomainsService.toResponse(await this.domainsRepo.findOne({where: {id}}))
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }

    async readAll(page: string, rows: string): Promise<DomainResponseDto[]> {
        try {
            const result = await this.domainsRepo.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
            return result.rows.map(d => DomainsService.toResponse(d))
        } catch (err) {
            throw new InternalServerErrorException(handleSequelizeError(err))
        }
    }

    async update(id: number, entity: DomainCreateDto): Promise<[number, DomainResponseDto[]]> {
        return Promise.resolve([0, []])
    }
}
