import {HttpStatus, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'

import {internal} from '~/entities'
import {ApiErrors, idPointer, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'


@Injectable()
export class DomainService implements CrudService<internal.Domain> {
    private readonly log = new LoggerService(DomainService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(DomainMariadbRepository) private readonly domainRepo: DomainMariadbRepository,
    ) {
    }

    async create(domains: internal.Domain[], sr: ServiceRequest): Promise<internal.Domain[]> {
        if (sr.user.reseller_id_required) {
            if (!await this.domainRepo.readResellerById(sr.user.reseller_id, sr))
                throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_ID_INVALID'))
            for (const domain of domains)
                domain.reseller_id = sr.user.reseller_id
        }
        const errors = new ApiErrors()
        for (const [index, domain] of domains.entries()) {
            if (!sr.user.reseller_id_required && !await this.domainRepo.readResellerById(domain.reseller_id, sr))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, index, domain, 'reseller_id'))
            if (await this.domainRepo.readByDomain(domain.domain, sr))
                errors.add(this.i18n.t('errors.DOMAIN_ALREADY_EXISTS', {args: {domain: domain.domain}}), itemPointer(sr, index, domain, 'domain'))
        }
        errors.throwIfAny()
        const createdIds = await this.domainRepo.create(domains, sr)
        return await this.domainRepo.readWhereInIds(createdIds, sr)
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
        throwMissingIds(sr, ids, domains.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const errors = new ApiErrors()
        for (const domain of domains) {
            if (sr.user.reseller_id_required && domain.reseller_id != sr.user.reseller_id)
                errors.add(this.i18n.t('errors.DOMAIN_DOES_NOT_BELONG_TO_RESELLER'), idPointer(sr, domain.id))
        }
        errors.throwIfAny(HttpStatus.FORBIDDEN)
        const deletedIds: number[] = []
        for (const domain of domains)
            deletedIds.push(await this.domainRepo.delete(domain.id, sr))
        return deletedIds
    }
}
