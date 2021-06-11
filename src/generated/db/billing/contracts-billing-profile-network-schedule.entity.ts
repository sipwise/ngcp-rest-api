import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ContractsBillingProfileNetworkScheduleAttributes {
    id?: number;
    profileNetworkId: number;
    effectiveStartTime: string;
}

@Table({
    tableName: 'contracts_billing_profile_network_schedule',
    timestamps: false,
})
export class ContractsBillingProfileNetworkSchedule extends Model<ContractsBillingProfileNetworkScheduleAttributes, ContractsBillingProfileNetworkScheduleAttributes> implements ContractsBillingProfileNetworkScheduleAttributes {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'PRIMARY',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    id?: number

    @Column({
        field: 'profile_network_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'cbpns_pnid_est_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profileNetworkId!: number

    @Column({
        field: 'effective_start_time',
        type: DataType.DECIMAL(13, 3),
    })
    @Index({
        name: 'cbpns_pnid_est_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    effectiveStartTime!: string

}
