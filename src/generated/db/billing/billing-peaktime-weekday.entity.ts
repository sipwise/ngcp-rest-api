import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface BillingPeaktimeWeekdayAttributes {
    id?: number;
    billing_profile_id: number;
    weekday: number;
    start?: string;
    end?: string;
}

@Table({
    tableName: 'billing_peaktime_weekdays',
    timestamps: false,
})
export class BillingPeaktimeWeekday extends Model<BillingPeaktimeWeekdayAttributes, BillingPeaktimeWeekdayAttributes> implements BillingPeaktimeWeekdayAttributes {

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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_profile_id!: number

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
