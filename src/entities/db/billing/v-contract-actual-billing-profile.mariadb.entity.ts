import {BaseEntity, ViewColumn, ViewEntity} from 'typeorm'



@ViewEntity({
    database: 'billing',
    name: 'v_actual_billing_profiles',
})
export class VActualBillingProfile extends BaseEntity {
    @ViewColumn({
        name: 'contract_id',
    })
        contract_id!: number

    @ViewColumn({
        name: 'billing_profile_id',
    })
        billing_profile_id!: number
}