import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {eventRuleViolations} from './event-rules'
import {FilterBy} from './interfaces/event.repository'
import {TimeSetEventMariadbRepository} from './repositories/event.mariadb.repository'

import {TimeSetMariadbRepository} from '~/api/time-sets/repositories/time-set.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class TimeSetEventService implements CrudService<internal.TimeSetEvent> {
    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(TimeSetEventMariadbRepository) private readonly eventRepo: TimeSetEventMariadbRepository,
        @Inject(TimeSetMariadbRepository) private readonly timeSetRepo: TimeSetMariadbRepository,
    ) {
    }

    async create(entities: internal.TimeSetEvent[], sr: ServiceRequest): Promise<internal.TimeSetEvent[]> {
        if (!entities.length)
            return []
        await this.checkTimeSets(entities, sr)
        await this.checkRules(entities, sr)
        const ids = await this.eventRepo.create(entities, sr)
        const created = new Map((await this.eventRepo.readWhereInIds(ids, sr)).map(event => [event.id, event]))
        return ids.map(id => created.get(id))
    }

    async readAll(sr: ServiceRequest): Promise<[internal.TimeSetEvent[], number]> {
        return await this.eventRepo.readAll(sr, this.filterBy(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.TimeSetEvent> {
        return await this.eventRepo.readById(id, sr, this.filterBy(sr))
    }

    async update(updates: Dictionary<internal.TimeSetEvent>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const events = await this.eventRepo.readWhereInIds(ids, sr, this.filterBy(sr))
        throwMissingIds(sr, ids, events.map(event => event.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // an update without time_set_id keeps the stored one
        const stored = new Map(events.map(event => [event.id, event]))
        const moved = new Dictionary<internal.TimeSetEvent>()
        for (const [id, update] of Object.entries(updates)) {
            update.timeSetId ??= stored.get(+id).timeSetId
            if (update.timeSetId != stored.get(+id).timeSetId)
                moved[id] = update
        }
        await this.checkTimeSets(moved, sr)
        await this.checkRules(updates, sr)
        return await this.eventRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const events = await this.eventRepo.readWhereInIds(ids, sr, this.filterBy(sr))
        throwMissingIds(sr, ids, events.map(event => event.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        return await this.eventRepo.delete(ids, sr)
    }

    /**
     * Deletes all events of the time sets; the caller checked the time sets
     */
    async deleteByTimeSetIds(timeSetIds: number[]): Promise<void> {
        await this.eventRepo.deleteByTimeSetIds(timeSetIds)
    }

    // events have no reseller, reseller roles reach the events of their reseller's time sets
    private filterBy(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.user.reseller_id_required)
            filterBy.resellerId = sr.user.reseller_id
        if (sr.params?.['timeSetId'])
            filterBy.timeSetId = +sr.params['timeSetId']
        return filterBy
    }

    /**
     * Every event needs a time set in the caller's scope
     */
    private async checkTimeSets(events: internal.TimeSetEvent[] | Dictionary<internal.TimeSetEvent>, sr: ServiceRequest): Promise<void> {
        const entries = Object.entries(events)
        if (!entries.length)
            return
        const timeSetIds = [...new Set(entries.map(([, event]) => event.timeSetId).filter(id => id != null))]
        const timeSets = await this.timeSetRepo.readWhereInIds(timeSetIds, sr, {resellerId: this.filterBy(sr).resellerId})
        const found = new Set(timeSets.map(timeSet => timeSet.id))
        const errors = new ApiErrors()
        await forEachYield(entries, ([key, event]) => {
            if (!found.has(event.timeSetId))
                errors.add(this.i18n.t('errors.ENTRY_NOT_FOUND'), itemPointer(sr, key, event, 'timeSetId'))
        })
        errors.throwIfAny()
    }

    /**
     * The rules between the fields apply to the events as they are after the write: the request DTO checks
     * the fields of a request only, and a PATCH validates just the patched ones
     */
    private async checkRules(events: internal.TimeSetEvent[] | Dictionary<internal.TimeSetEvent>, sr: ServiceRequest): Promise<void> {
        const errors = new ApiErrors()
        await forEachYield(Object.entries(events), ([key, event]) => {
            for (const {field, key: errorKey} of eventRuleViolations(event))
                errors.add(this.i18n.t(`errors.${errorKey}`, {args: {field}}), itemPointer(sr, key, event, field))
        })
        errors.throwIfAny()
    }
}
