import {BaseEntity, ViewColumn, ViewEntity} from 'typeorm'

@ViewEntity({
    database: 'billing',
    name: 'v_contract_timezone',
})
export class VContractTimezone extends BaseEntity {
    @ViewColumn({
        name: 'contract_id',
    })
        contract_id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string | null
}
