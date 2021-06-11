import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VContractBillingProfileNetworkScheduleAttributes {
    id: number;
    contractId: number;
    startDate?: Date;
    endDate?: Date;
    billingProfileId: number;
    networkId?: number;
    effectiveStartTime: string;
    effectiveStartDate?: Date;
    billingProfileName: string;
    billingProfileHandle: string;
    billingNetworkName?: string;
}

@Table({
    tableName: 'v_contract_billing_profile_network_schedules',
    timestamps: false,
    comment: 'VIEW',
})
export class VContractBillingProfileNetworkSchedule extends Model<VContractBillingProfileNetworkScheduleAttributes, VContractBillingProfileNetworkScheduleAttributes> implements VContractBillingProfileNetworkScheduleAttributes {

    @Column({
        type: DataType.INTEGER,
    })
    id!: number

    @Column({
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    contractId!: number

    @Column({
        field: 'start_date',
        allowNull: true,
        type: DataType.DATE,
    })
    startDate?: Date

    @Column({
        field: 'end_date',
        allowNull: true,
        type: DataType.DATE,
    })
    endDate?: Date

    @Column({
        field: 'billing_profile_id',
        type: DataType.INTEGER,
    })
    billingProfileId!: number

    @Column({
        field: 'network_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    networkId?: number

    @Column({
        field: 'effective_start_time',
        type: DataType.DECIMAL(13, 3),
    })
    effectiveStartTime!: string

    @Column({
        field: 'effective_start_date',
        allowNull: true,
        type: DataType.DATE(3),
    })
    effectiveStartDate?: Date

    @Column({
        field: 'billing_profile_name',
        type: DataType.STRING(31),
    })
    billingProfileName!: string

    @Column({
        field: 'billing_profile_handle',
        type: DataType.STRING(63),
    })
    billingProfileHandle!: string

    @Column({
        field: 'billing_network_name',
        allowNull: true,
        type: DataType.STRING(255),
    })
    billingNetworkName?: string

}
