import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {Product} from './product.mariadb.entity'
import {BillingNetwork} from './billing-network.mariadb.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'billing_mappings',
    database: 'billing',
})
export class BillingMapping extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'date',
    })
        start_date?: Date

    @Column({
        nullable: true,
        type: 'date',
    })
        end_date?: Date

     @Column({
         nullable: true,
         type: 'int',
     })
         billing_profile_id?: number


    @Column({
        nullable: true,
        type: 'int',
    })
        contract_id: number

    @Column({
        nullable: true,
        type: 'int',
    })
        product_id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        network_id?: number

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
        contract?: Contract

    @ManyToOne(() => Product, product => product.id)
    @JoinColumn({name: 'product_id'})
        product?: Product

    @ManyToOne(() => BillingNetwork, network => network.id)
    @JoinColumn({name: 'network_id'})
        network?: BillingNetwork

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
