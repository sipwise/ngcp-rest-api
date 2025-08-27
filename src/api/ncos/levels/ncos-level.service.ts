import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {In} from 'typeorm'

import {NCOSLevelMariadbRepository} from './repositories/ncos-level.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
        const timeSetIds = new Set<number>()
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id
            await this.checkPermissions(entity.resellerId, sr)
            timeSetIds.add(entity.timeSetId)
        }))

        await this.hasAccessToTimeSets(timeSetIds, sr)

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

        if (levels.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != levels.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const timeSetIds = new Set<number>()
        for (const level of levels) {
            timeSetIds.add(level.timeSetId)
        }
        await this.hasAccessToTimeSets(timeSetIds, sr)

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

        if (levels.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != levels.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.ncosLevelRepo.delete(ids, sr)
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }

    private async hasAccessToTimeSets(timeSetIds: Set<number>, sr: ServiceRequest): Promise<void> {
        if (sr.user.role == RbacRole.reseller || sr.user.role == RbacRole.subscriberadmin) {
            const timeSets = await db.provisioning.VoipTimeSet.findBy({
                id: In(Array.from(timeSetIds)),
                reseller: {
                    id: sr.user.reseller_id,
                },
            })
            if (timeSets.length != timeSetIds.size) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                const message = GenerateErrorMessageArray(Array.from(timeSetIds), error.message)
                throw new UnprocessableEntityException(message)
            }
        }

        return
    }
}
