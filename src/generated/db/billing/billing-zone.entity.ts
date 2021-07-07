import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {BillingProfile} from './billing-profile.entity'
import {BillingFee} from './billing-fee.entity'
import {BillingZonesHistory} from './billing-zones-history.entity'

interface BillingZoneAttributes {
    id?: number;
    billing_profile_id: number;
    zone: string;
    detail?: string;
}

@Table({
    tableName: 'billing_zones',
    timestamps: false,
})
export class BillingZone extends Model<BillingZoneAttributes, BillingZoneAttributes> implements BillingZoneAttributes {

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

    @ForeignKey(() => BillingProfile)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profnamdes_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    billing_profile_id!: number

    @Column({
        type: DataType.STRING(127),
    })
    @Index({
        name: 'profnamdes_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    zone!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    @Index({
        name: 'profnamdes_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    detail?: string

    @BelongsTo(() => BillingProfile)
    BillingProfile?: BillingProfile

    @HasMany(() => BillingFee, {
        sourceKey: 'id',
    })
    BillingFees?: BillingFee[]

    @HasMany(() => BillingZonesHistory, {
        sourceKey: 'id',
    })
    BillingZonesHistories?: BillingZonesHistory[]

}
