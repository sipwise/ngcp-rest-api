import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {In} from 'typeorm'

import {NCOSLevelMariadbRepository} from './repositories/level.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class NCOSLevelService implements CrudService<internal.NCOSLevel> {
    private readonly log = new LoggerService(NCOSLevelService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(NCOSLevelMariadbRepository) private readonly ncosLevelRepo: NCOSLevelMariadbRepository,
    ) {
    }

    async create(entities: internal.NCOSLevel[], sr: ServiceRequest): Promise<internal.NCOSLevel[]> {
        this.assignUserResellerId(entities, sr)
        await this.hasAccessToTimeSets(entities, sr)

        const createdIds = await this.ncosLevelRepo.create(entities)
        return await this.ncosLevelRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.NCOSLevel[], number]> {
        if (sr.user.role == RbacRole.reseller)
            return await this.ncosLevelRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        if (sr.user.role == RbacRole.subscriberadmin)
            return await this.ncosLevelRepo.readAll(sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
        return await this.ncosLevelRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.NCOSLevel> {
        if (sr.user.role == RbacRole.reseller)
            return await this.ncosLevelRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        if (sr.user.role == RbacRole.subscriberadmin)
            return await this.ncosLevelRepo.readById(id, sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
        return await this.ncosLevelRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.NCOSLevel>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let levels: internal.NCOSLevel[]
        switch (sr.user.role) {
            case RbacRole.reseller:
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
                break
            case RbacRole.subscriberadmin:
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
                break
            default:
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr)
                break
        }

        throwMissingIds(sr, ids, levels.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        await this.hasAccessToTimeSets(updates, sr)

        this.assignUserResellerId(Object.values(updates), sr)
        return await this.ncosLevelRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let levels: internal.NCOSLevel[]
        switch (sr.user.role) {
            case 'reseller':
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
                break
            case RbacRole.subscriberadmin:
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id, exposeToCustomer: true})
                break
            default:
                levels = await this.ncosLevelRepo.readWhereInIds(ids, sr)
                break
        }

        throwMissingIds(sr, ids, levels.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.ncosLevelRepo.delete(ids, sr)
    }

    private assignUserResellerId(entities: internal.NCOSLevel[], sr: ServiceRequest): void {
        if (!sr.user.reseller_id_required)
            return
        for (const entity of entities)
            entity.resellerId = sr.user.reseller_id
    }

    /**
     * Reports every item whose time set is not one of the user's reseller (reseller, subscriberadmin)
     */
    private async hasAccessToTimeSets(levels: internal.NCOSLevel[] | Dictionary<internal.NCOSLevel>, sr: ServiceRequest): Promise<void> {
        if (sr.user.role != RbacRole.reseller && sr.user.role != RbacRole.subscriberadmin)
            return
        const ids = [...new Set(Object.values(levels).map(level => level.timeSetId).filter(id => id != null))]
        if (!ids.length)
            return
        const timeSets = await db.provisioning.VoipTimeSet.findBy({
            id: In(ids),
            reseller: {
                id: sr.user.reseller_id,
            },
        })
        const errors = new ApiErrors()
        for (const [key, level] of Object.entries(levels)) {
            if (level.timeSetId != null && !timeSets.some(timeSet => timeSet.id == level.timeSetId))
                errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), itemPointer(sr, key, level, 'timeSetId'))
        }
        errors.throwIfAny()
    }
}
