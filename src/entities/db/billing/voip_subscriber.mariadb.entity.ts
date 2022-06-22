import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {VoipSubscriberStatus} from '../../internal/voip-subscriber.internal.entity'

@Entity({
    name: 'voip_subscribers',
    database: 'billing',
})
export class VoipSubscriber extends BaseEntity {
    @PrimaryGeneratedColumn()
        id?: number

    @Column({
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
        unsigned: true,
    })
        primary_number_id?: boolean

    @Column({
        type: 'varchar',
        length: 255,
    })
        external_id?: string

    @Column({
        unsigned: true,
        nullable: true,
    })
        contact_id?: number

    @ManyToOne(() => Contract)
    @JoinColumn({name: 'contract_id'})
        contract?: Contract
}
