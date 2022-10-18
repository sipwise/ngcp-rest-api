import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipNumberStatus} from '../../internal/voip-number.internal.entity'
import {Reseller} from './reseller.mariadb.entity'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

@Entity({
    name: 'voip_numbers',
    database: 'billing',
})
export class VoipNumber extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'int',
        unsigned: true,
    })
    cc?: number

    @Column({
        type: 'varchar',
        length: 7,
    })
    ac?: string

    @Column({
        type: 'varchar',
        length: 31,
    })
    sn?: string

    @Column({
        type: 'int',
        unsigned: true,
    })
    reseller_id?: number

    @Column({
        type: 'int',
        unsigned: true,
    })
    subscriber_id?: number

    @Column({
        type: 'enum',
        enum: VoipNumberStatus,
        default: VoipNumberStatus.Active,
    })
    status: string

    @Column({
        type: 'boolean',
        default: false,
    })
    ported: boolean

    @Column({
        type: 'date',
    })
    list_timestamp: Date

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
    reseller?: Reseller

    @ManyToOne(() => VoipSubscriber, subscriber => subscriber.id)
    @JoinColumn({name: 'subscriber_id'})
    subscriber?: VoipSubscriber
}