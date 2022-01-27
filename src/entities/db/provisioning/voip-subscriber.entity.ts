import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from '../billing/contract.entity'
import {VoipSubscriber as BillingVoipSubscriber} from '../billing/voip_subscriber.entity'
import {VoipDomain} from './voip-domain.entity'

@Entity({
    name: 'voip_subscribers',
    database: 'provisioning',
})
export class VoipSubscriber extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'varchar',
        length: 127,
    })
    username: string

    @Column({
        unsigned: true,
    })
    domain_id: number

    @Column({
        type: 'char',
        length: 36,
    })
    uuid: string

    @Column({
        type: 'varchar',
        length: 40,
        nullable: true,
    })
    password: string

    @Column({
        default: 0,
    })
    admin: boolean

    @Column({
        unsigned: true,
        nullable: true,
    })
    account_id: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
    webusername: string

    @Column({
        type: 'char',
        length: 56,
        nullable: true,
    })
    webpassword: string

    @Column({
        default: 0,
    })
    is_pbx_pilot: boolean

    @Column({
        default: 0,
    })
    is_pbx_group: boolean

    @Column({
        type: 'enum',
        enum: [
            'serial',
            'parallel',
            'random',
            'circular',
        ],
        nullable: true,
    })
    pbx_hunt_policy: string

    @Column({
        unsigned: true,
        nullable: true,
    })
    pbx_hunt_timeout: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    pbx_extension: string

    @Column({
        unsigned: true,
        nullable: true,
    })
    profile_set_id: number

    @Column({
        unsigned: true,
        nullable: true,
    })
    profile_id: number

    @Column({
        type: 'timestamp',
        default: 'current_timestamp',
    })
    modify_timestamp: string

    @Column({
        type: 'timestamp',
        default: '0000-00-00 00:00:00',
    })
    create_timestamp: string

    @OneToOne(() => BillingVoipSubscriber)
    @JoinColumn({name: 'uuid', referencedColumnName: 'uuid'})
    billing_voip_subscriber: BillingVoipSubscriber

    @ManyToOne(() => VoipDomain, domain => domain.id)
    @JoinColumn({name: 'domain_id'})
    domain: VoipDomain

    @ManyToOne(() => Contract)
    @JoinColumn({name: 'account_id'})
    contract?: Contract
}
