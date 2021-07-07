import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VActualEffectiveStartTimeAttributes {
    contract_id: number;
    effective_start_time?: string;
}

@Table({
    tableName: '_v_actual_effective_start_time',
    timestamps: false,
    comment: 'VIEW',
})
export class VActualEffectiveStartTime extends Model<VActualEffectiveStartTimeAttributes, VActualEffectiveStartTimeAttributes> implements VActualEffectiveStartTimeAttributes {

    @Column({
        type: DataType.INTEGER,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 3),
    })
    effective_start_time?: string

}
