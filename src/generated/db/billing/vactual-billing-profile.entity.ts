import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VActualBillingProfileAttributes {
    contract_id: number;
    billing_profile_id: number;
}

@Table({
    tableName: 'v_actual_billing_profiles',
    timestamps: false,
    comment: 'VIEW',
})
export class VActualBillingProfile extends Model<VActualBillingProfileAttributes, VActualBillingProfileAttributes> implements VActualBillingProfileAttributes {

    @Column({
        type: DataType.INTEGER,
    })
    contract_id!: number

    @Column({
        type: DataType.INTEGER,
    })
    billing_profile_id!: number

}
