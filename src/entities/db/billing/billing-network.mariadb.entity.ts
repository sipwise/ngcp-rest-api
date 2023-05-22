import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {BillingNetworkStatus} from '../../internal/billing-network.internal.entity'
import {Reseller} from './reseller.mariadb.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'billing_networks',
    database: 'billing',
})
export class BillingNetwork extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        reseller_id?: number

    @Column({
        nullable: false,
        type: 'varchar',
        length: 255,
    })
        name: string

    @Column({
        nullable: false,
        type: 'varchar',
        length: 255,
    })
        description: string

    @Column({
        type: 'enum',
        enum: BillingNetworkStatus,
        default: [BillingNetworkStatus.Active],
    })
        status: BillingNetworkStatus

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller: Reseller

    fromInternal(network: internal.BillingNetwork): BillingNetwork {
        this.reseller_id = network.resellerId
        this.id = network.id
        this.reseller = network.reseller
        this.name = network.name
        this.status = network.status
        this.description = network.description
        return this
    }

    toInternal(): internal.BillingNetwork {
        return internal.BillingNetwork.create({
            resellerId: this.reseller_id,
            id: this.id,
            reseller: this.reseller,
            name: this.name,
            status: this.status,
            description: this.description
        })
    }
}
