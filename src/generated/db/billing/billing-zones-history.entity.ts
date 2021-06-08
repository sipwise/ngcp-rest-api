import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {BillingZone} from './billing-zone.entity'

@Table({
    tableName: 'billing_zones_history',
    timestamps: false,
})
export class BillingZonesHistory extends Model {

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
        field: 'bz_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bzid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    bzId?: number

    @Column({
        field: 'billing_profile_id',
        type: DataType.INTEGER,
    })
    billingProfileId!: number

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
