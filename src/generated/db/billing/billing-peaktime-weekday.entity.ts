import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'billing_peaktime_weekdays',
    timestamps: false,
})
export class BillingPeaktimeWeekday extends Model {

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
        field: 'billing_profile_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billingProfileId!: number

    @Column({
        type: DataType.TINYINT,
    })
    weekday!: number

    @Column({
        allowNull: true,
        type: DataType.TIME,
    })
    start?: string

    @Column({
        allowNull: true,
        type: DataType.TIME,
    })
    end?: string

}
