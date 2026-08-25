import {Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, NCOSSetLevelMariadbRepository} from './repositories/level.mariadb.repository'

import {NCOSSetMariadbRepository} from '~/api/ncos/sets/repositories/set.mariadb.repository'
import {internal} from '~/entities'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class NCOSSetLevelService implements CrudService<internal.NCOSSetLevel> {
    private readonly log = new LoggerService(NCOSSetLevelService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(NCOSSetLevelMariadbRepository) private readonly ncosSetLevelRepo: NCOSSetLevelMariadbRepository,
        @Inject(NCOSSetMariadbRepository) private readonly ncosSetRepo: NCOSSetMariadbRepository,
    ) {
    }

    async create(entities: internal.NCOSSetLevel[], sr: ServiceRequest): Promise<internal.NCOSSetLevel[]> {
        const setIds = [...new Set(entities.map(entity => entity.ncosSetId))]
        for (const setId of setIds) {
            const ncosSet = await this.ncosSetRepo.readById(setId, sr)
            await this.checkPermissions(ncosSet.resellerId, sr)
        }

        const createdIds = await this.ncosSetLevelRepo.create(entities)

        return await this.ncosSetLevelRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.NCOSSetLevel[], number]> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.role == 'reseller')
            filters.resellerId = sr.user.reseller_id

        return await this.ncosSetLevelRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.NCOSSetLevel> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.role == 'reseller')
            filters.resellerId = sr.user.reseller_id

        return await this.ncosSetLevelRepo.readById(id, sr, filters)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const entities = await this.ncosSetLevelRepo.readWhereInIds(ids, sr)
        if (entities.length == 0)
            throw new NotFoundException()

        const setIds = [...new Set(entities.map(entity => entity.ncosSetId))]
        for (const setId of setIds) {
            const ncosSet = await this.ncosSetRepo.readById(setId, sr)
            await this.checkPermissions(ncosSet.resellerId, sr)
        }

        return await this.ncosSetLevelRepo.delete(ids, sr)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        return filterBy
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }
}
