import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface BillingPeaktimeSpecialAttributes {
    id?: number;
    billingProfileId: number;
    start?: Date;
    end?: Date;
}

@Table({
    tableName: 'billing_peaktime_special',
    timestamps: false,
})
export class BillingPeaktimeSpecial extends Model<BillingPeaktimeSpecialAttributes, BillingPeaktimeSpecialAttributes> implements BillingPeaktimeSpecialAttributes {

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
        allowNull: true,
        type: DataType.DATE,
    })
    start?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    end?: Date

}
