import {BaseEntity, ViewColumn, ViewEntity} from 'typeorm'

@ViewEntity({
    database: 'billing',
    name: 'v_subscriber_timezone',
})
export class VSubscriberTimezone extends BaseEntity {
    @ViewColumn({
        name: 'subscriber_id',
    })
        subscriber_id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string | null
}
