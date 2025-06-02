import {BaseEntity,ViewColumn,ViewEntity} from 'typeorm'

import {internal} from '~/entities'

@ViewEntity({
    database: 'billing',
    name: 'v_contract_billing_profile_network_schedules',
})
export class VContractBillingProfileNetworkSchedule extends BaseEntity {
    @ViewColumn()
        id!: number

    @ViewColumn()
        contract_id!: number

    @ViewColumn()
        start_date!: Date | null

    @ViewColumn()
        end_date!: Date | null

    @ViewColumn()
        billing_profile_id!: number

    @ViewColumn()
        network_id!: number | null

    @ViewColumn()
        effective_start_time!: string // TypeORM will round if this is decimal

    @ViewColumn()
        effective_start_date!: Date

    @ViewColumn()
        billing_profile_name!: string

    @ViewColumn()
        billing_profile_handle!: string

    @ViewColumn()
        billing_network_name!: string | null

    toInternalCustomerBillingProfile(): internal.CustomerBillingProfile {
        const customer = internal.CustomerBillingProfile.create({
            id: this.billing_profile_id,
            endDate: this.end_date,
            networkId: this.network_id,
            startDate: this.start_date,
            effectiveStartTime: new Date(Number(this.effective_start_time) * 1000),
        })
        return customer
    }
}
