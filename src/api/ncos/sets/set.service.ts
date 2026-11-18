import {Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {NCOSSetMariadbRepository} from './repositories/set.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {throwMissingIds} from '~/helpers/errors.helper'
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
        this.assignUserResellerId(entities, sr)
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
        const oldSets = new Map((await this.ncosSetRepo.readWhereInIds(ids, sr)).map(set => [set.id, set]))
        throwMissingIds(sr, ids, [...oldSets.keys()], this.i18n.t('errors.ENTRY_NOT_FOUND'))
        for (const set of oldSets.values())
            this.checkPermissions(set.resellerId, sr)
        const revokes = ids.filter(id => oldSets.get(id).exposeToCustomer && !updates[id].exposeToCustomer)
        if (revokes.length)
            await this.ncosSetRepo.revokeNCOSSetPreferences(revokes)
        this.assignUserResellerId(Object.values(updates), sr)
        return await this.ncosSetRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const sets = await this.ncosSetRepo.readWhereInIds(ids, sr)
        throwMissingIds(sr, ids, sets.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        for (const set of sets) {
            this.checkPermissions(set.resellerId, sr)
        }
        await this.ncosSetRepo.deleteNCOSSetPreferences(ids)
        return await this.ncosSetRepo.delete(ids, sr)
    }

    private checkPermissions(resellerId: number, sr: ServiceRequest): void {
        if (sr.user.reseller_id_required && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }

    private assignUserResellerId(entities: internal.NCOSSet[], sr: ServiceRequest): void {
        if (!sr.user.reseller_id_required)
            return
        for (const entity of entities)
            entity.resellerId = sr.user.reseller_id
    }

    private async revokeNCOSSetPreferences(setIds: number[]): Promise<void> {
        await this.ncosSetRepo.revokeNCOSSetPreferences(setIds)
    }
}
