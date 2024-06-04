import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {ContractBillingProfileNetwork} from './contract-billing-profile-network.mariadb.entity'


@Entity({
    name: 'contracts_billing_profile_network_schedule',
    database: 'billing',
})
export class ContractBillingProfileNetworkSchedule extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        profile_network_id!: number

    @Column({
        type: 'decimal',
        nullable: false,
    })
        effective_start_time!: number

    @ManyToOne(() => ContractBillingProfileNetwork, cbpn => cbpn.id)
    @JoinColumn({name: 'profile_network_id'})
        profileNetwork!: ContractBillingProfileNetwork

}
