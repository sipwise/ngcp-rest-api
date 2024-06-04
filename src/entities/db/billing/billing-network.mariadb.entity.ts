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
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        description!: string

    @Column({
        type: 'enum',
        enum: BillingNetworkStatus,
        nullable: false,
        default: [BillingNetworkStatus.Active],
    })
        status!: BillingNetworkStatus

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

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
            description: this.description,
        })
    }
}
