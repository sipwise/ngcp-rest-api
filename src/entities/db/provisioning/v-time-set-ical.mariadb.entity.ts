import {BaseEntity, ViewColumn, ViewEntity} from 'typeorm'

// the iCalendar of a time set as call routing reads it, NULL for a set without events
@ViewEntity({
    database: 'provisioning',
    name: 'v_time_sets_ical',
})
export class VTimeSetIcal extends BaseEntity {
    @ViewColumn({
        name: 'id',
    })
        id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string

    @ViewColumn({
        name: 'ical',
    })
        ical!: string | null
}
