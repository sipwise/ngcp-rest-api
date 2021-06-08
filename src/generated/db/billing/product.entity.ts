import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {BillingProfile} from './billing-profile.entity'
import {Contract} from './contract.entity'
import {Reseller} from './reseller.entity'

@Table({
    tableName: 'products',
    timestamps: false,
})
export class Product extends Model {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'reshand_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

    @Column({
        type: DataType.ENUM('sippeering', 'pstnpeering', 'reseller', 'sipaccount', 'pbxaccount'),
    })
    class!: string

    @Column({
        type: DataType.STRING(63),
    })
    @Index({
        name: 'reshand_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    handle!: string

    @Column({
        type: DataType.STRING(127),
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        field: 'on_sale',
        type: DataType.TINYINT,
    })
    onSale!: number

    @Column({
        allowNull: true,
        type: DataType.DOUBLE(22),
    })
    price?: number

    @Column({
        allowNull: true,
        type: DataType.MEDIUMINT,
    })
    weight?: number

    @ForeignKey(() => BillingProfile)
    @Column({
        field: 'billing_profile_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billingProfileId?: number

    @BelongsTo(() => BillingProfile)
    BillingProfile?: BillingProfile

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
