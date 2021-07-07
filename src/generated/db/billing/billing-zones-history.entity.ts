import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {BillingZone} from './billing-zone.entity'

interface BillingZonesHistoryAttributes {
    id?: number;
    bz_id?: number;
    billing_profile_id: number;
    zone: string;
    detail?: string;
}

@Table({
    tableName: 'billing_zones_history',
    timestamps: false,
})
export class BillingZonesHistory extends Model<BillingZonesHistoryAttributes, BillingZonesHistoryAttributes> implements BillingZonesHistoryAttributes {

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

    @ForeignKey(() => BillingZone)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bzid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    bz_id?: number

    @Column({
        type: DataType.INTEGER,
    })
    billing_profile_id!: number

    @Column({
        type: DataType.STRING(127),
    })
    zone!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    detail?: string

    @BelongsTo(() => BillingZone)
    BillingZone?: BillingZone

}
