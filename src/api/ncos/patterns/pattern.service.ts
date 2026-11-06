import {Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {NCOSPatternMariadbRepository} from './repositories/pattern.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class NCOSPatternService implements CrudService<internal.NCOSPattern> {
    private readonly log = new LoggerService(NCOSPatternService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(NCOSPatternMariadbRepository) private readonly ncosPatternRepo: NCOSPatternMariadbRepository,
    ) {
    }

    async create(entities: internal.NCOSPattern[], sr: ServiceRequest): Promise<internal.NCOSPattern[]> {
        const levelIds = new Set<number>()
        await Promise.all(entities.map(async entity => {
            levelIds.add(entity.ncosLevelId)
        }))

        await this.hasAccessToLevels(levelIds, sr)

        const createdIds = await this.ncosPatternRepo.create(entities)
        return await this.ncosPatternRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.NCOSPattern[], number]> {
        if (sr.user.role == RbacRole.reseller)
            return await this.ncosPatternRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        return await this.ncosPatternRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.NCOSPattern> {
        if (sr.user.role == RbacRole.reseller)
            return await this.ncosPatternRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        return await this.ncosPatternRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.NCOSPattern>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let patterns: internal.NCOSPattern[]
        switch (sr.user.role) {
            case RbacRole.reseller:
                patterns = await this.ncosPatternRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
                break
            default:
                patterns = await this.ncosPatternRepo.readWhereInIds(ids, sr)
                break
        }

        throwMissingIds(sr, ids, patterns.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const timeSetIds = new Set<number>()
        for (const pattern of patterns) {
            timeSetIds.add(pattern.ncosLevelId)
        }
        await this.hasAccessToLevels(timeSetIds, sr)

        return await this.ncosPatternRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let patterns: internal.NCOSPattern[]
        switch (sr.user.role) {
            case 'reseller':
                patterns = await this.ncosPatternRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
                break
            default:
                patterns = await this.ncosPatternRepo.readWhereInIds(ids, sr)
                break
        }

        throwMissingIds(sr, ids, patterns.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.ncosPatternRepo.delete(ids, sr)
    }

    private async hasAccessToLevels(levelIds: Set<number>, sr: ServiceRequest): Promise<void> {
        if (sr.user.role == RbacRole.reseller) {
            const result = await this.ncosPatternRepo.hasAccessToLevels(levelIds, sr.user.reseller_id, sr)
            if (!result) {
                throw new NotFoundException()
            }
        }

        return
    }
}
