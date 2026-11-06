
import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerBalanceMariadbRepository} from './repositories/balance.mariadb.repository'

import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerBalanceService implements CrudService<internal.ContractBalance> {
    private readonly log = new LoggerService(CustomerBalanceService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(CustomerBalanceMariadbRepository) private readonly customerBalanceRepo: CustomerBalanceMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.ContractBalance[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.customerBalanceRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.ContractBalance> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.customerBalanceRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.ContractBalance>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let balances: internal.ContractBalance[]
        if (sr.user.reseller_id_required) {
            balances = await this.customerBalanceRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            balances = await this.customerBalanceRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, balances.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const updatedIds = await this.customerBalanceRepo.update(updates, sr)

        return updatedIds
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['customerId']) {
            filterBy.customerId = +sr.params['customerId']
        }
        return filterBy
    }
}
