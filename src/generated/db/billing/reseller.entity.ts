import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {ProfilePackage} from './profile-package.entity'
import {Customer} from './customer.entity'
import {VoipNumber} from './voip-number.entity'
import {Contact} from './contact.entity'
import {BillingProfile} from './billing-profile.entity'
import {Voucher} from './voucher.entity'
import {BillingNetwork} from './billing-network.entity'
import {Product} from './product.entity'
import {NcosLevel} from './ncos-level.entity'
import {Order} from './order.entity'

@Table({
    tableName: 'resellers',
    timestamps: false,
})
export class Reseller extends Model {

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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contractId!: number

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

    @HasMany(() => ProfilePackage, {
        sourceKey: 'id',
    })
    ProfilePackages?: ProfilePackage[]

    @HasMany(() => Customer, {
        sourceKey: 'id',
    })
    Customers?: Customer[]

    @HasMany(() => VoipNumber, {
        sourceKey: 'id',
    })
    VoipNumbers?: VoipNumber[]

    @HasMany(() => Contact, {
        sourceKey: 'id',
    })
    Contacts?: Contact[]

    @HasMany(() => BillingProfile, {
        sourceKey: 'id',
    })
    BillingProfiles?: BillingProfile[]

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    @HasMany(() => BillingNetwork, {
        sourceKey: 'id',
    })
    BillingNetworks?: BillingNetwork[]

    @HasMany(() => Product, {
        sourceKey: 'id',
    })
    Products?: Product[]

    @HasMany(() => NcosLevel, {
        sourceKey: 'id',
    })
    NcosLevels?: NcosLevel[]

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

}
