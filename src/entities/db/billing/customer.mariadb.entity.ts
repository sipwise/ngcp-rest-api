//import {Order} from './order.entity'
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'customers',
    database: 'billing',
})
export class Customer extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        reseller_id?: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        shopuser?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        shoppass?: string

    @Column({
        type: 'boolean',
    })
        business!: boolean

    @Column({
        nullable: true,
        type: 'int',
    })
        contact_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        tech_contact_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        comm_contact_id?: number

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        external_id?: string

    @Column({
        type: 'date',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
    })
        create_timestamp!: Date

    // @ManyToOne(type => Contact, contact => contact.id)
    // contact?: Contact

    // @ManyToOne(type => Contact, contact => contact.id)
    // comContact?: Contact

    // @ManyToOne(type => Contact, contact => contact.id)
    // techContact?: Contact

    // @OneToMany(type => Contract, contract => contract.id)
    // contracts?: Contract[]

    // // @HasMany(() => Order, {
    // //     sourceKey: 'id',
    // // })
    // // Orders?: Order[]

    // @ManyToOne(type => Reseller, reseller => reseller.id)
    // reseller?: Reseller

}
