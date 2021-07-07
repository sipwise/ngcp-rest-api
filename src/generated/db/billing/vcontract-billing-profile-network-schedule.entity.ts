import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VContractBillingProfileNetworkScheduleAttributes {
    id: number;
    contract_id: number;
    start_date?: Date;
    end_date?: Date;
    billing_profile_id: number;
    network_id?: number;
    effective_start_time: string;
    effective_start_date?: Date;
    billing_profile_name: string;
    billing_profile_handle: string;
    billing_network_name?: string;
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
        type: DataType.INTEGER,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    start_date?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    end_date?: Date

    @Column({
        type: DataType.INTEGER,
    })
    billing_profile_id!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    network_id?: number

    @Column({
        type: DataType.DECIMAL(13, 3),
    })
    effective_start_time!: string

    @Column({
        allowNull: true,
        type: DataType.DATE(3),
    })
    effective_start_date?: Date

    @Column({
        type: DataType.STRING(31),
    })
    billing_profile_name!: string

    @Column({
        type: DataType.STRING(63),
    })
    billing_profile_handle!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    billing_network_name?: string

}
