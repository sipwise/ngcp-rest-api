import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {BillingProfile} from './billing-profile.entity'
import {Contract} from './contract.entity'
import {Reseller} from './reseller.entity'

interface ProductAttributes {
    id?: number;
    reseller_id?: number;
    class: string;
    handle: string;
    name: string;
    on_sale: number;
    price?: number;
    weight?: number;
    billing_profile_id?: number;
}

@Table({
    tableName: 'products',
    timestamps: false,
})
export class Product extends Model<ProductAttributes, ProductAttributes> implements ProductAttributes {

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
    reseller_id?: number

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
        type: DataType.TINYINT,
    })
    on_sale!: number

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_profile_id?: number

    @BelongsTo(() => BillingProfile)
    BillingProfile?: BillingProfile

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
