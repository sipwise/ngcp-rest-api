import {ForbiddenException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RbacRole} from '../../config/constants.config'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
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

    async create(domains: internal.Domain[], sr: ServiceRequest): Promise<internal.Domain[]> {
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
        const createdIds = await this.domainRepo.create(domains, sr)
        return await this.domainRepo.readWhereInIds(createdIds, sr)
    }

    private async resellerIdExists(id: number, sr: ServiceRequest): Promise<void> {
        const reseller = await this.domainRepo.readResellerById(id, sr)
        if (!reseller) {
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
        }
    }

    private async domainExists(domain: string, sr: ServiceRequest): Promise<void> {
        const result = await this.domainRepo.readByDomain(domain, sr)
        // TODO: This is a bug imho. The condition should be `if (result != undefined) {`
        // eslint-disable-next-line no-constant-binary-expression
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

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({
            message: 'delete domain by id',
            func: this.delete.name,
            user: sr.user.username,
        })
        const domains = await this.domainRepo.readWhereInIds(ids, sr)
        if (domains.length != ids.length)
            throw new UnprocessableEntityException()
        const deletedIds: number[] = []
        for(const domain of domains) {
            if (RbacRole.reseller == sr.user.role && domain.reseller_id != sr.user.reseller_id) {
                throw new ForbiddenException(this.i18n.t('errors.DOMAIN_DOES_NOT_BELONG_TO_RESELLER'))
            }
            deletedIds.push(await this.domainRepo.delete(domain.id, sr))
        }
        return deletedIds
    }
}
