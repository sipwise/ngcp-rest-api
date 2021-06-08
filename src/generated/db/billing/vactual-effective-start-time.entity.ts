import {Column, DataType, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: '_v_actual_effective_start_time',
    timestamps: false,
    comment: 'VIEW',
})
export class VActualEffectiveStartTime extends Model {

    @Column({
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    contractId!: number

    @Column({
        field: 'effective_start_time',
        allowNull: true,
        type: DataType.DECIMAL(13, 3),
    })
    effectiveStartTime?: string

}
