import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {ContractBillingProfileNetworkSchedule} from './contract-billing-profile-network-schedule.mariadb.entity'
import {BillingProfile} from './billing-profile.mariadb.entity'

@Entity({
    database: 'billing',
    name: 'contracts_billing_profile_network',
})
export class ContractBillingProfileNetwork extends BaseEntity {
    @PrimaryGeneratedColumn()
        id: number

    @Column({
        nullable: false,
        type: 'int',
        unsigned: true,
    })
        contract_id: number

    @Column({
        nullable: false,
        type: 'int',
        unsigned: true,
    })
        billing_profile_id: number

    @Column({
        nullable: true,
        type: 'int',
        unsigned: true,
    })
        billing_network_id?: number

    @Column({
        nullable: true,
        type: 'datetime',
    })
        start_date?: Date

    @Column({
        nullable: true,
        type: 'datetime',
    })
        end_date?: Date

    @Column({
        nullable: false,
        type: 'tinyint',
        default: 0,
        width: 3,
    })
        base: number

    @OneToMany(type => ContractBillingProfileNetworkSchedule, cbpns => cbpns.profileNetwork)
        schedules: ContractBillingProfileNetworkSchedule[]

    @ManyToOne(() => BillingProfile, billingProfile => billingProfile.id, {eager: true})
    @JoinColumn({name: 'billing_profile_id'})
        billingProfile: BillingProfile

    @ManyToOne(() => Contract, contract => contract.id, )
    @JoinColumn({name: 'contract_id'})
        contract: Contract

}
