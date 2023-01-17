import {ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {NCOSSetMariadbRepository} from './repositories/ncos-set.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {validateOrReject} from 'class-validator'
import {I18nService} from 'nestjs-i18n'

@Injectable()
export class NCOSSetService implements CrudService<internal.NCOSSet> {
    private readonly log = new LoggerService(NCOSSetService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(NCOSSetMariadbRepository) private readonly ncosSetRepo: NCOSSetMariadbRepository,
    ) {
    }

    async create(entity: internal.NCOSSet, sr: ServiceRequest): Promise<internal.NCOSSet> {
        if (!entity.resellerId)
            entity.resellerId = sr.user.reseller_id
        await this.checkPermissions(entity.resellerId, sr)
        return await this.ncosSetRepo.create(entity, sr)
    }

    async createMany(entities: internal.NCOSSet[], sr: ServiceRequest): Promise<internal.NCOSSet[]> {
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id
            await this.checkPermissions(entity.resellerId, sr)
        }))
        return await this.ncosSetRepo.createMany(entities)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.NCOSSet[], number]> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readAll(sr, { resellerId: sr.user.reseller_id })
        return await this.ncosSetRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.NCOSSet> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readById(id, sr, { resellerId: sr.user.reseller_id })
        return await this.ncosSetRepo.readById(id, sr)
    }

    async update(id: number, entity: internal.NCOSSet, sr: ServiceRequest): Promise<internal.NCOSSet> {
        await this.checkPermissions(entity.resellerId, sr)
        return await this.ncosSetRepo.update(id, entity, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.NCOSSet> {
        const oldEntity = await this.ncosSetRepo.readById(id, sr)
        const entity: internal.NCOSSet = applyPatch(oldEntity, patch).newDocument
        await this.checkPermissions(entity.resellerId, sr)
        try {
            await validateOrReject(entity)
        } catch(e) {
            throw new UnprocessableEntityException(e)
        }
        return await this.ncosSetRepo.update(id, entity, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        const entity = await this.ncosSetRepo.readById(id, sr)
        await this.checkPermissions(entity.resellerId, sr)
        return await this.ncosSetRepo.delete(id, sr)
    }

    async createLevel(id: number, entity: internal.NCOSSetLevel, sr: ServiceRequest): Promise<internal.NCOSSetLevel> {
        entity.ncosSetId = id
        const ncosSet = await this.read(entity.ncosSetId, sr)
        await this.checkPermissions(ncosSet.resellerId, sr)
        return await this.ncosSetRepo.createLevel(entity, sr)
    }

    async createLevelMany(id: number, entities: internal.NCOSSetLevel[], sr: ServiceRequest): Promise<internal.NCOSSetLevel[]> {
        const ncosSet = await this.read(id, sr)
        await Promise.all(entities.map(async entity => {
            entity.ncosSetId = id
        }))
        await this.checkPermissions(ncosSet.resellerId, sr)
        return await this.ncosSetRepo.createLevelMany(entities, sr)
    }

    async readLevelAll(sr: ServiceRequest, id?: number): Promise<[internal.NCOSSetLevel[], number]> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readLevelAll(sr, id, { resellerId: sr.user.reseller_id })
        return await this.ncosSetRepo.readLevelAll(sr, id)
    }

    async readLevel(id: number, levelId: number, sr: ServiceRequest): Promise<internal.NCOSSetLevel> {
        if (sr.user.role == 'reseller')
            return await this.ncosSetRepo.readLevelById(id, levelId, sr, { resellerId: sr.user.reseller_id })
        return await this.ncosSetRepo.readLevelById(id, levelId, sr)
    }

    async deleteLevel(id: number, levelId: number, sr: ServiceRequest): Promise<number> {
        const entity = await this.ncosSetRepo.readLevelById(id, levelId, sr)
        const ncosSet = await this.read(entity.ncosSetId, sr)
        await this.checkPermissions(ncosSet.resellerId, sr)
        return await this.ncosSetRepo.deleteLevel(id, levelId, sr)
    }

    private async checkPermissions(reseller_id: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.reseller_id_required && sr.user.reseller_id != reseller_id) {
            throw new NotFoundException()
        }
    }
}
