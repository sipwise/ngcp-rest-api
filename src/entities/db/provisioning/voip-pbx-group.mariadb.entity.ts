import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {VoipSubscriber} from './voip-subscriber.mariadb.entity'

@Entity({
    name: 'voip_pbx_groups',
    database: 'provisioning',
})
export class VoipPbxGroup extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        subscriber_id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        group_id!: number

    //  @ManyToOne(() => VoipSubscriber, subscriber => subscriber.pbx_group_members)
    //  @JoinColumn({name: 'group_id'})
    //      subscriber: VoipSubscriber

    @OneToMany(() => VoipSubscriber, subscriber => subscriber.pbx_group)
        members!: VoipSubscriber[]
}
