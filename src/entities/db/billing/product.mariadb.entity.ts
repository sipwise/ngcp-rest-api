import {Contract} from './contract.mariadb.entity'
import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {ProductClass} from '../../internal/product.internal.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'products',
    database: 'billing',
})
export class Product extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'enum',
        enum: ProductClass,
        nullable: false,
    })
        class!: ProductClass

    @Column({
        type: 'varchar',
        length: 63,
        nullable: false,
    })
        handle!: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        on_sale!: boolean

    @Column({
        type: 'double',
        width: 22,
        nullable: true,
    })
        price?: number

    @Column({
        type: 'mediumint',
        unsigned: true,
        nullable: true,
    })
        weight?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        billing_profile_id?: number

    // @ManyToOne(() => BillingProfile, billingProfile => billingProfile.id)
    // BillingProfile?: BillingProfile

    @OneToMany(() => Contract, contract => contract.id)
        contracts!: Contract[]

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    toInternal(): internal.Product {
        return internal.Product.create({
            billing_profile_id: this.billing_profile_id,
            class: this.class,
            handle: this.handle,
            id: this.id,
            name: this.name,
            on_sale: this.on_sale,
            price: this.price,
            reseller_id: this.reseller_id,
            weight: this.weight,
        })
    }

    fromInternal(product: internal.Product): Product {
        this.billing_profile_id = product.billing_profile_id
        this.class = product.class
        this.handle = product.handle
        this.id = product.id
        this.name = product.name
        this.on_sale = product.on_sale
        this.price = product.price
        this.reseller_id = product.reseller_id
        this.weight = product.weight

        return this
    }
}
