// import {Voucher} from './voucher.entity'
// import {Product} from './product.entity'
// import {BillingNetwork} from './billing-network.entity'
// import {ProfilePackage} from './profile-package.entity'
// import {BillingProfile} from './billing-profile.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {Contact} from './contact.mariadb.entity'
import {Contract} from './contract.mariadb.entity'
import {Domain} from './domain.mariadb.entity'
import {Journal} from './journal.mariadb.entity'

import {internal} from '~/entities'
import {InvoiceTemplate} from '~/entities/db/billing/invoice-template.mariadb.entity'
import {ResellerPhonebook} from '~/entities/db/billing/reseller-phonebook.mariadb.entity'
import {VoipTimeSet} from '~/entities/db/provisioning'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
// import {VoipNumber} from './voip-number.entity'
// import {NcosLevel} from './ncos-level.entity'
// import {Order} from './order.entity'

// enum Status {
//     Active = 'active',
//     Locked = 'locked',
//     Terminated = 'terminated'
// }

@Entity({
    name: 'resellers',
    database: 'billing',
})
export class Reseller extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

    @Column({
        type: 'varchar',
        length: 63,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'enum',
        enum: ResellerStatus,
        nullable: false,
        default: ResellerStatus.Active,
    })
        status!: ResellerStatus

    @ManyToOne(() => Contract, contract => contract.resellers)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

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

    @OneToMany(() => Contact, contact => contact.reseller)
        contacts!: Contact[]

    @OneToMany(() => Domain, domain => domain.reseller)
        domains!: Domain[]

    @OneToMany(()=> ResellerPhonebook, resellerPhonebook => resellerPhonebook.reseller)
        phonebook!: ResellerPhonebook[]

    @OneToMany(() => VoipTimeSet, voipTimeSet => voipTimeSet.reseller)
        voipTimeSets!: VoipTimeSet[]


    @OneToMany(() => InvoiceTemplate, invoiceTemplate => invoiceTemplate.reseller)
        invoiceTemplates!: InvoiceTemplate[]

    @OneToMany(() => Journal, journal => journal.reseller)
        journals!: Journal[]

    // @HasMany(() => VoipNumber, {
    //     sourceKey: 'id',
    // })
    // VoipNumbers?: VoipNumber[]

    // @HasMany(() => Customer, {
    //     sourceKey: 'id',
    // })
    // @OneToMany(() => Customer, customer => customer.reseller)
    // customers?: Customer[]

    // @HasMany(() => NcosLevel, {
    //     sourceKey: 'id',
    // })
    // NcosLevels?: NcosLevel[]

    // @HasMany(() => Order, {
    //     sourceKey: 'id',
    // })
    // Orders?: Order[]

    toInternal(): internal.Reseller {
        return internal.Reseller.create({
            id: this.id,
            contract_id: this.contract_id,
            name: this.name,
            status: this.status,
        })
    }

    fromInternal(reseller: internal.Reseller): Reseller {
        this.id = reseller.id
        this.contract_id = reseller.contract_id
        this.name = reseller.name
        this.status = reseller.status
        return this
    }
}
