import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipDomain} from './voip-domain.mariadb.entity'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

@Entity({
    name: 'voip_dbaliases',
    database: 'provisioning',
})
export class VoipDBAlias extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number

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
        type: 'int',
        unsigned: true,
    })
    subscriber_id: number

    @Column({
        type: 'boolean',
        default: false,
    })
    is_primary: boolean

    @Column({
        type: 'boolean',
        default: false,
    })
    is_devid: boolean

    @Column({
        type: 'varchar',
        length: 127,
    })
    devid_alias: string

    @ManyToOne(() => VoipDomain, domain => domain.id)
    @JoinColumn({name: 'domain_id'})
    domain?: VoipDomain

    @ManyToOne(() => VoipSubscriber, reseller => reseller.id)
    @JoinColumn({name: 'subscriber_id'})
    subscriber?: VoipSubscriber
}