import {Column, DataType, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'v_actual_billing_profiles',
    timestamps: false,
    comment: 'VIEW',
})
export class VActualBillingProfile extends Model {

    @Column({
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    contractId!: number

    @Column({
        field: 'billing_profile_id',
        type: DataType.INTEGER,
    })
    billingProfileId!: number

}
