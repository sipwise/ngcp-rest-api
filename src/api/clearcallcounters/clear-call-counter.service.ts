
import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ClearCallCounterRedisRepository} from './repositories/clear-call-counter.redis.repository'

import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ClearCallCounterService {
    private readonly log = new LoggerService(ClearCallCounterService.name)

    constructor(
        private readonly i18n: I18nService,
        @Inject(ClearCallCounterRedisRepository) private readonly clearCallCounterRepo: ClearCallCounterRedisRepository,
    ) {
    }

    async create(sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            user: sr.user.username,
        })

        await this.clearCallCounterRepo.clearCallCounters(sr)

        return true
    }

    async readAll(sr: ServiceRequest): Promise<[string[], number]> {
        this.log.debug({
            message: 'read all call counters',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const stuckCalls = await this.clearCallCounterRepo.getStuckCalls(sr)
        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        const count = stuckCalls.length
        const paged = stuckCalls.slice((page - 1) * rows, page * rows)
        return [paged, count]
    }
}
