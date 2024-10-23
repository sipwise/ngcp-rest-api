import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from '~/entities/db/billing/contract.mariadb.entity'
import {Product} from '~/entities/db/billing/product.mariadb.entity'
import {BillingNetwork} from '~/entities/db/billing/billing-network.mariadb.entity'
import {internal} from '~/entities'

@Entity({
    name: 'billing_mappings',
    database: 'billing',
})
export class BillingMapping extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'date',
        nullable: true,
    })
        start_date?: Date

    @Column({
        type: 'date',
        nullable: true,
    })
        end_date?: Date

     @Column({
         type: 'int',
         unsigned: true,
         nullable: true,
     })
         billing_profile_id?: number


    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        product_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        network_id?: number

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

    @ManyToOne(() => Product, product => product.id)
    @JoinColumn({name: 'product_id'})
        product!: Product

    @ManyToOne(() => BillingNetwork, network => network.id)
    @JoinColumn({name: 'network_id'})
        network!: BillingNetwork

    toInternal(): internal.BillingMapping {
        return internal.BillingMapping.create({
            billingProfileId: this.billing_profile_id,
            effectiveStartTime: undefined,
            endDate: this.end_date,
            networkId: this.network_id,
            startDate: this.start_date,
        })
    }
}
