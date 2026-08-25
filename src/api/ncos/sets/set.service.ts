import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {NCOSSetMariadbRepository} from './repositories/set.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class NCOSSetService implements CrudService<internal.NCOSSet> {
    private readonly log = new LoggerService(NCOSSetService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(NCOSSetMariadbRepository) private readonly ncosSetRepo: NCOSSetMariadbRepository,
    ) {
    }

    async create(entities: internal.NCOSSet[], sr: ServiceRequest): Promise<internal.NCOSSet[]> {
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id
            await this.checkPermissions(entity.resellerId, sr)
        }))
        const createdIds = await this.ncosSetRepo.create(entities)
        return await this.ncosSetRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.NCOSSet[], number]> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        if (sr.user.role == 'subscriberadmin')
            return await this.ncosSetRepo.readAll(sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
        return await this.ncosSetRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.NCOSSet> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        if (sr.user.role == 'subscriberadmin')
            return await this.ncosSetRepo.readById(id, sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
        return await this.ncosSetRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.NCOSSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const revokes: number[] = []
        for (const id of ids) {
            const entity = updates[id]
            await this.checkPermissions(entity.resellerId, sr)
            const oldEntity = await this.ncosSetRepo.readById(id, sr)
            if (oldEntity.exposeToCustomer && !entity.exposeToCustomer)
                revokes.push(id)
        }
        if (revokes.length)
            await this.ncosSetRepo.revokeNCOSSetPreferences(revokes)
        return await this.ncosSetRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const sets = await this.ncosSetRepo.readWhereInIds(ids, sr)
        if (ids.length != sets.length)
            throw new UnprocessableEntityException()
        for (const set of sets) {
            await this.checkPermissions(set.resellerId, sr)
        }
        await this.ncosSetRepo.deleteNCOSSetPreferences(ids)
        return await this.ncosSetRepo.delete(ids, sr)
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }

    private async revokeNCOSSetPreferences(setIds: number[]): Promise<void> {
        await this.ncosSetRepo.revokeNCOSSetPreferences(setIds)
    }
}
