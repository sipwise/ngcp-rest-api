import {BaseEntity, ViewColumn, ViewEntity} from 'typeorm'

@ViewEntity({
    database: 'billing',
    name: 'v_reseller_timezone',
})
export class VResellerTimezone extends BaseEntity {
    @ViewColumn({
        name: 'reseller_id',
    })
        reseller_id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string | null
}
