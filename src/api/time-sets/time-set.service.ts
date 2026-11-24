import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy} from '~/api/time-sets/interfaces/time-set.repository'
import {TimeSetMariadbRepository} from '~/api/time-sets/repositories/time-set.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, idPointer, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {forEachYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

function emptyCalendar(name: string): string {
    return [
        'BEGIN:VCALENDAR',
        'PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN',
        `NAME:${name}`,
        'VERSION:2.0',
        'END:VCALENDAR',
        '',
    ].join('\n')
}

@Injectable()
export class TimeSetService implements CrudService<internal.TimeSet> {
    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(TimeSetMariadbRepository) private readonly timeSetRepo: TimeSetMariadbRepository,
    ) {
    }

    async create(entities: internal.TimeSet[], sr: ServiceRequest): Promise<internal.TimeSet[]> {
        this.assignUserResellerId(entities, sr)
        await this.checkResellers(entities, sr)
        await this.checkNames(entities, [], sr)
        const ids = await this.timeSetRepo.create(entities, sr)
        const created = new Map((await this.timeSetRepo.readWhereInIds(ids, sr)).map(set => [set.id, set]))
        return ids.map(id => created.get(id))
    }

    async readAll(sr: ServiceRequest): Promise<[internal.TimeSet[], number]> {
        return await this.timeSetRepo.readAll(sr, this.roleScope(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.TimeSet> {
        return await this.timeSetRepo.readById(id, sr, this.roleScope(sr))
    }

    /**
     * The iCalendar that call routing evaluates; a time set without events has a calendar without VEVENTs
     */
    async readCalendar(id: number, sr: ServiceRequest): Promise<{timeSet: internal.TimeSet, ical: string}> {
        const timeSet = await this.read(id, sr)
        const ical = await this.timeSetRepo.readIcal(id)
        return {timeSet, ical: ical ?? emptyCalendar(timeSet.name)}
    }

    async update(updates: Dictionary<internal.TimeSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const sets = await this.timeSetRepo.readWhereInIds(ids, sr, this.roleScope(sr))
        throwMissingIds(sr, ids, sets.map(set => set.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        this.assignUserResellerId(Object.values(updates), sr)
        await this.checkResellers(updates, sr)
        await this.checkNames(updates, ids, sr)
        return await this.timeSetRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const sets = await this.timeSetRepo.readWhereInIds(ids, sr, this.roleScope(sr))
        throwMissingIds(sr, ids, sets.map(set => set.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const errors = new ApiErrors()
        for (const id of await this.timeSetRepo.readUsedIds(ids))
            errors.add(this.i18n.t('errors.TIME_SET_IN_USE'), idPointer(sr, id))
        errors.throwIfAny()
        return await this.timeSetRepo.delete(ids, sr)
    }

    private roleScope(sr: ServiceRequest): FilterBy {
        return sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : {}
    }

    private assignUserResellerId(entities: internal.TimeSet[], sr: ServiceRequest): void {
        if (!sr.user.reseller_id_required)
            return
        for (const entity of entities)
            entity.resellerId = sr.user.reseller_id
    }

    private async checkResellers(timeSets: internal.TimeSet[] | Dictionary<internal.TimeSet>, sr: ServiceRequest): Promise<void> {
        const entries = Object.entries(timeSets)
        const resellerIds = new Set(await this.timeSetRepo.readExistingResellerIds(entries.map(([, set]) => set.resellerId)))
        const errors = new ApiErrors()
        await forEachYield(entries, ([key, set]) => {
            if (!resellerIds.has(set.resellerId))
                errors.add(this.i18n.t('errors.RESELLER_ID_INVALID'), itemPointer(sr, key, set, 'resellerId'))
        })
        errors.throwIfAny()
    }

    /**
     * Names are unique across resellers: reports names of other time sets and names repeated in the request
     * @param ownIds ids of the request's time sets, their stored names are free to take
     */
    private async checkNames(timeSets: internal.TimeSet[] | Dictionary<internal.TimeSet>, ownIds: number[], sr: ServiceRequest): Promise<void> {
        const entries = Object.entries(timeSets)
        const conflicts = await this.timeSetRepo.readNameConflicts(entries.map(([, set]) => set.name), ownIds)
        const takenNames = new Set(conflicts.map(set => set.name.toLowerCase()))
        const errors = new ApiErrors()
        await forEachYield(entries, ([key, set]) => {
            const name = set.name.toLowerCase()
            if (takenNames.has(name))
                errors.add(this.i18n.t('errors.TIME_SET_NAME_EXISTS', {args: {name: set.name}}), itemPointer(sr, key, set, 'name'))
            takenNames.add(name)
        })
        errors.throwIfAny()
    }
}
