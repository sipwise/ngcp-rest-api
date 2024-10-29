import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipDomain} from './voip-domain.mariadb.entity'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

@Entity({
    name: 'voip_dbaliases',
    database: 'provisioning',
})
export class VoipDBAlias extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        username!: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        domain_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        subscriber_id!: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_primary!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_devid!: boolean

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        devid_alias?: string

    @ManyToOne(() => VoipDomain, domain => domain.id)
    @JoinColumn({name: 'domain_id'})
        domain!: VoipDomain

    @ManyToOne(() => VoipSubscriber, reseller => reseller.id)
    @JoinColumn({name: 'subscriber_id'})
        subscriber!: VoipSubscriber
}