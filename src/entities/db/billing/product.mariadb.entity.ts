import {Contract} from './contract.mariadb.entity'
import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

enum Class {
    SipPeering = 'sippeering',
    PstnPeering = 'pstnpeering',
    Reseller = 'reseller',
    SipAccount = 'sipaccount',
    PbxAccount = 'pbxaccount'
}

@Entity({
    name: 'products',
    database: 'billing',
})
export class Product extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        reseller_id?: number

    @Column({
        type: 'set',
        enum: Class,
    })
        class!: string

    @Column({
        type: 'varchar',
        length: 63,
    })
        handle!: string

    @Column({
        type: 'varchar',
        length: 127,
    })
        name!: string

    @Column({
        type: 'boolean',
    })
        on_sale!: boolean

    @Column({
        nullable: true,
        type: 'double',
        width: 22,
    })
        price?: number

    @Column({
        nullable: true,
        type: 'mediumint',
    })
        weight?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        billing_profile_id?: number

    // @ManyToOne(type => BillingProfile, billingProfile => billingProfile.id)
    // BillingProfile?: BillingProfile

    @OneToMany(type => Contract, contract => contract.id)
        contracts?: Contract[]

    @ManyToOne(type => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller?: Reseller
}
