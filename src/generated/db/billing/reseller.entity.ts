import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Voucher} from './voucher.entity'
import {Product} from './product.entity'
import {BillingNetwork} from './billing-network.entity'
import {ProfilePackage} from './profile-package.entity'
import {BillingProfile} from './billing-profile.entity'
import {Contact} from './contact.entity'
import {VoipNumber} from './voip-number.entity'
import {Customer} from './customer.entity'
import {NcosLevel} from './ncos-level.entity'
import {Order} from './order.entity'

interface ResellerAttributes {
    id?: number;
    contract_id: number;
    name: string;
    status: string;
}

@Table({
    tableName: 'resellers',
    timestamps: false,
})
export class Reseller extends Model<ResellerAttributes, ResellerAttributes> implements ResellerAttributes {

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

    @ForeignKey(() => Contract)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contract_id!: number

    @Column({
        type: DataType.STRING(63),
    })
    @Index({
        name: 'name_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.ENUM('active', 'locked', 'terminated'),
    })
    status!: string

    @BelongsTo(() => Contract)
    Contract?: Contract

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @HasMany(() => Product, {
        sourceKey: 'id',
    })
    Products?: Product[]

    @HasMany(() => BillingNetwork, {
        sourceKey: 'id',
    })
    BillingNetworks?: BillingNetwork[]

    @HasMany(() => ProfilePackage, {
        sourceKey: 'id',
    })
    ProfilePackages?: ProfilePackage[]

    @HasMany(() => BillingProfile, {
        sourceKey: 'id',
    })
    BillingProfiles?: BillingProfile[]

    @HasMany(() => Contact, {
        sourceKey: 'id',
    })
    Contacts?: Contact[]

    @HasMany(() => VoipNumber, {
        sourceKey: 'id',
    })
    VoipNumbers?: VoipNumber[]

    @HasMany(() => Customer, {
        sourceKey: 'id',
    })
    Customers?: Customer[]

    @HasMany(() => NcosLevel, {
        sourceKey: 'id',
    })
    NcosLevels?: NcosLevel[]

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

}
