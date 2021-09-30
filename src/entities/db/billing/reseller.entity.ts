// import {Voucher} from './voucher.entity'
// import {Product} from './product.entity'
// import {BillingNetwork} from './billing-network.entity'
// import {ProfilePackage} from './profile-package.entity'
// import {BillingProfile} from './billing-profile.entity'
import {Contact} from './contact.entity'
import {Contract} from './contract.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {ResellerStatus} from '../../../api/resellers/dto/reseller-base.dto'
// import {VoipNumber} from './voip-number.entity'
// import {NcosLevel} from './ncos-level.entity'
// import {Order} from './order.entity'

enum Status {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

@Entity({
    name: 'resellers',
    database: 'billing',
})
export class Reseller extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'int',
    })
    contract_id!: number

    @Column({
        type: 'varchar',
        length: 63,
    })
    name!: string

    @Column({
        type: 'enum',
        enum: ResellerStatus,
        default: ResellerStatus.Active,
    })
    status!: ResellerStatus

    @ManyToOne(type => Contract, contract => contract.resellers)
    @JoinColumn({name: 'contract_id'})
    contract?: Contract

    // @HasMany(() => Voucher, {
    //     sourceKey: 'id',
    // })
    // Vouchers?: Voucher[]

    // @HasMany(() => Product, {
    //     sourceKey: 'id',
    // })
    // Products?: Product[]

    // @HasMany(() => BillingNetwork, {
    //     sourceKey: 'id',
    // })
    // BillingNetworks?: BillingNetwork[]

    // @HasMany(() => ProfilePackage, {
    //     sourceKey: 'id',
    // })
    // ProfilePackages?: ProfilePackage[]

    // @HasMany(() => BillingProfile, {
    //     sourceKey: 'id',
    // })
    // BillingProfiles?: BillingProfile[]

    @OneToMany(type => Contact, contact => contact.reseller)
    contacts?: Contact[]

    // @HasMany(() => VoipNumber, {
    //     sourceKey: 'id',
    // })
    // VoipNumbers?: VoipNumber[]

    // @HasMany(() => Customer, {
    //     sourceKey: 'id',
    // })
    // @OneToMany(type => Customer, customer => customer.reseller)
    // customers?: Customer[]

    // @HasMany(() => NcosLevel, {
    //     sourceKey: 'id',
    // })
    // NcosLevels?: NcosLevel[]

    // @HasMany(() => Order, {
    //     sourceKey: 'id',
    // })
    // Orders?: Order[]
}
