import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import {Contract} from '../billing/contract.mariadb.entity'
import {VoipSubscriber as BillingVoipSubscriber} from '../billing/voip-subscriber.mariadb.entity'
import {VoipDomain} from './voip-domain.mariadb.entity'
import {VoipPbxGroup} from './voip-pbx-group.mariadb.entity'
import {internal} from '../../../entities'
import {VoipDBAlias} from './voip-dbalias.mariadb.entity'

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
        type: 'int',
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
        type: 'boolean',
        default: 0,
    })
        admin: boolean

    @Column({
        type: 'int',
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
        type: 'boolean',
        default: 0,
    })
        is_pbx_pilot: boolean

    @Column({
        type: 'boolean',
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
        type: 'int',
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
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        profile_set_id: number

    @Column({
        type: 'int',
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

    @ManyToOne(() => VoipPbxGroup)
    @JoinColumn({name: 'id', referencedColumnName: 'subscriber_id'})
        pbx_group?: VoipPbxGroup

    // @OneToMany(() => VoipPbxGroup, group => group.subscriber)
    //     pbx_group_members?: VoipPbxGroup[]

    @ManyToMany(() => VoipSubscriber)
    @JoinTable({
        name: 'voip_pbx_groups',
        joinColumn: {name: 'group_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'subscriber_id', referencedColumnName: 'id'},
    })
    pbx_group_members?: VoipSubscriber[]

    members?: VoipSubscriber[]

    @OneToMany(type => VoipDBAlias, alias => alias.subscriber)
    dbAliases?: VoipDBAlias[]

    toInternalPbxGroup(): internal.PbxGroup {
        const group = new internal.PbxGroup()
        group.id = this.id
        group.name = this.username
        group.extension = this.pbx_extension
        group.huntPolicy = this.pbx_hunt_policy
        group.huntTimeout = this.pbx_hunt_timeout
        group.members = this.members.map(member => member.toInternalPbxGroupMemberItem())
        return group
    }

    toInternalPbxGroupMemberItem(): internal.PbxGroupMemberItem {
        return new internal.PbxGroupMemberItem(this.pbx_extension, this.id)
    }
}
