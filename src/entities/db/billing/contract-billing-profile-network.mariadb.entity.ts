import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {ContractBillingProfileNetworkSchedule} from './contract-billing-profile-network-schedule.mariadb.entity'
import {BillingProfile} from './billing-profile.mariadb.entity'

@Entity({
    name: 'contracts_billing_profile_network',
    database: 'billing',
})
export class ContractBillingProfileNetwork extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        billing_profile_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        billing_network_id?: number

    @Column({
        type: 'datetime',
        nullable: true,
    })
        start_date?: Date

    @Column({
        type: 'datetime',
        nullable: true,
    })
        end_date?: Date

    @Column({
        type: 'tinyint',
        width: 3,
        nullable: false,
        default: 0,
    })
        base!: number

    @OneToMany(type => ContractBillingProfileNetworkSchedule, cbpns => cbpns.profileNetwork)
        schedules!: ContractBillingProfileNetworkSchedule[]

    @ManyToOne(() => BillingProfile, billingProfile => billingProfile.id, {eager: true})
    @JoinColumn({name: 'billing_profile_id'})
        billingProfile!: BillingProfile

    @ManyToOne(() => Contract, contract => contract.id, )
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

}
