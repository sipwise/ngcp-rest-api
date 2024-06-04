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
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        cc!: number

    @Column({
        type: 'varchar',
        length: 7,
        nullable: false,
    })
        ac!: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: false,
    })
        sn!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        subscriber_id?: number

    @Column({
        type: 'enum',
        enum: VoipNumberStatus,
        nullable: false,
        default: VoipNumberStatus.Active,
    })
        status!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        ported!: boolean

    @Column({
        type: 'date',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        list_timestamp: Date

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    @ManyToOne(() => VoipSubscriber, subscriber => subscriber.id)
    @JoinColumn({name: 'subscriber_id'})
        subscriber!: VoipSubscriber
}