import {
    ForbiddenException,
    Inject,
    Injectable,
    NotImplementedException,
    UnprocessableEntityException,
} from '@nestjs/common'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RbacRole} from '../../config/constants.config'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
import {DomainCreateDto} from './dto/domain-create.dto'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'

@Injectable()
export class DomainService implements CrudService<internal.Domain> {
    private readonly log = new LoggerService(DomainService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(DomainMariadbRepository) private readonly domainRepo: DomainMariadbRepository,
    ) {
    }

    async create(domain: internal.Domain, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'create domain',
            func: this.create.name,
            user: sr.user.username,
        })
        if (RbacRole.reseller == sr.user.role) {
            domain.reseller_id = sr.user.reseller_id
        }

        // check if reseller exists
        await this.resellerIdExists(domain.reseller_id, sr)
        await this.domainExists(domain.domain, sr)

        return await this.domainRepo.create(domain, sr)
    }

    async createMany(domains: internal.Domain[], sr: ServiceRequest): Promise<internal.Domain[]> {
        if (RbacRole.reseller == sr.user.role) {
            await this.resellerIdExists(sr.user.reseller_id, sr)
            for (const domain of domains) {
                domain.reseller_id = sr.user.reseller_id
                await this.domainExists(domain.domain, sr)
            }
        } else {
            for (const domain of domains) {
                await this.resellerIdExists(domain.reseller_id, sr)
                await this.domainExists(domain.domain, sr)
            }
        }
        const createdIds = await this.domainRepo.createMany(domains, sr)
        return await this.domainRepo.readWhereInIds(createdIds, sr)
    }

    private async resellerIdExists(id: number, sr: ServiceRequest) {
        const reseller = await this.domainRepo.readResellerById(id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
        }
    }

    private async domainExists(domain: string, sr: ServiceRequest) {
        const result = await this.domainRepo.readByDomain(domain, sr)
        if (!result == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.DOMAIN_ALREADY_EXISTS', {args: {domain: domain}}))
        }
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return (await this.domainRepo.readAll(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by id',
            func: this.read.name,
            user: sr.user.username,
        })
        return await this.domainRepo.readById(id, sr)
    }

    async update(id: number, domain: DomainCreateDto, sr: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete domain by id',
            func: this.delete.name,
            user: sr.user.username,
        })
        const domain = await this.domainRepo.readById(id, sr)
        if (RbacRole.reseller == sr.user.role && domain.reseller_id != sr.user.reseller_id) {
            throw new ForbiddenException(this.i18n.t('errors.DOMAIN_DOES_NOT_BELONG_TO_RESELLER'))
        }
        return await this.domainRepo.delete(id, sr)
    }
}
