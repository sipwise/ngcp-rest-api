import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {VoipSubscriber as ProvisioningVoipSubscriber} from '../provisioning/voip-subscriber.mariadb.entity'
import {VoipSubscriberStatus} from '../../internal/voip-subscriber.internal.entity'
import {VoipNumber} from './voip-number.mariadb.entity'

@Entity({
    name: 'voip_subscribers',
    database: 'billing',
})
export class VoipSubscriber extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'int',
        unsigned: true,
    })
        contract_id: number

    @Column({
        type: 'char',
        length: 36,
    })
        uuid: string

    @Column({
        type: 'varchar',
        length: 127,
    })
        username: string

    @Column({
        type: 'int',
        unsigned: true,
    })
        domain_id: number

    @Column({
        type: 'enum',
        enum: VoipSubscriberStatus,
        default: VoipSubscriberStatus.Active,
    })
        status: string

    @Column({
        type: 'int',
        unsigned: true,
    })
        primary_number_id?: boolean

    @Column({
        type: 'varchar',
        length: 255,
    })
        external_id?: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
    contact_id?: number

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
    contract?: Contract

    @OneToOne(() => ProvisioningVoipSubscriber)
    @JoinColumn({name: 'uuid', referencedColumnName: 'uuid'})
    provisioningVoipSubscriber: ProvisioningVoipSubscriber

    @OneToMany(type => VoipNumber, number => number.subscriber)
    voipNumbers?: VoipNumber[]
}
