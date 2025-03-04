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

import {VoipDBAlias} from './voip-dbalias.mariadb.entity'
import {VoipDomain} from './voip-domain.mariadb.entity'
import {VoipPbxGroup} from './voip-pbx-group.mariadb.entity'

import {internal} from '~/entities'
import {Contract} from '~/entities/db/billing/contract.mariadb.entity'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {VoipUsrPreference} from '~/entities/db/provisioning/voip-usr-preference.mariadb.entity'

@Entity({
    name: 'voip_subscribers',
    database: 'provisioning',
})
export class VoipSubscriber extends BaseEntity {

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
        type: 'char',
        length: 36,
        nullable: false,
    })
        uuid!: string

    @Column({
        type: 'varchar',
        length: 40,
        nullable: true,
    })
        password?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        admin!: boolean

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        account_id?: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        webusername?: string

    @Column({
        type: 'char',
        length: 56,
        nullable: true,
    })
        webpassword?: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
    })
        webpassword_modify_timestamp: Date

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_pbx_pilot!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        is_pbx_group!: boolean

    @Column({
        type: 'enum',
        enum: [
            'serial',
            'parallel',
            'random',
            'circular',
            'none',
        ],
        nullable: true,
        default: 'none',
    })
        pbx_hunt_policy?: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        pbx_hunt_timeout?: number

    @Column({
        type: 'enum',
        enum: [
            'bye',
            'cancel',
        ],
        nullable: true,
        default: 'cancel',
    })
        pbx_hunt_cancel_mode?: string


    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        pbx_extension?: string

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        profile_set_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        profile_id?: number

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        modify_timestamp!: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        create_timestamp!: string

    @Column({
        type: 'int',
        width: 11,
        nullable: false,
        unsigned: true,
        default: 0,
    })
        ban_increment_stage!: number

    @Column({
        type: 'timestamp',
        nullable: true,
    })
        last_banned_at?: Date

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        last_banned_ip?: string

    @OneToOne(() => BillingVoipSubscriber)
    @JoinColumn({name: 'uuid', referencedColumnName: 'uuid'})
        billing_voip_subscriber: BillingVoipSubscriber

    @ManyToOne(() => VoipDomain, domain => domain.id)
    @JoinColumn({name: 'domain_id'})
        domain!: VoipDomain

    @ManyToOne(() => Contract)
    @JoinColumn({name: 'account_id'})
        contract!: Contract

    @ManyToOne(() => VoipPbxGroup)
    @JoinColumn({name: 'id', referencedColumnName: 'subscriber_id'})
        pbx_group!: VoipPbxGroup

    // @OneToMany(() => VoipPbxGroup, group => group.subscriber)
    //     pbx_group_members?: VoipPbxGroup[]

    @ManyToMany(() => VoipSubscriber)
    @JoinTable({
        name: 'voip_pbx_groups',
        joinColumn: {name: 'group_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'subscriber_id', referencedColumnName: 'id'},
    })
        pbx_group_members!: VoipSubscriber[]

    members!: VoipSubscriber[]

    @OneToMany(() => VoipDBAlias, alias => alias.subscriber)
        dbAliases!: VoipDBAlias[]

    @OneToMany(() => VoipUsrPreference, preference => preference.voipSubscriber)
        preferences!: VoipUsrPreference[]

    toInternal(): internal.VoipSubscriber {
        const subscriber = new internal.VoipSubscriber()
        subscriber.id = this.id
        subscriber.webPassword = this.password
        subscriber.webPasswordModifyTimestamp = this.webpassword_modify_timestamp
        return subscriber
    }

    toInternalPbxGroup(): internal.PbxGroup {
        const group = new internal.PbxGroup()
        group.id = this.id
        group.name = this.username
        group.extension = this.pbx_extension
        group.huntPolicy = this.pbx_hunt_policy
        group.huntTimeout = this.pbx_hunt_timeout
        group.members = this.members.map(member => member.toInternalPbxGroupMember())
        return group
    }

    toInternalPbxGroupMember(): internal.PbxGroupMember {
        const groupMember = new internal.PbxGroupMember()
        groupMember.extension = this.pbx_extension
        groupMember.subscriberId = this.id
        groupMember.username = this.username
        groupMember.domain = this.domain.domain
        return groupMember
    }

    toInternalPbxUser(): internal.PbxUser {
        const pbxUser = new internal.PbxUser()
        pbxUser.id = this.billing_voip_subscriber.id
        pbxUser.displayName = this.preferences[0] ? this.preferences[0].value : null
        pbxUser.pbxExtension = this.pbx_extension
        pbxUser.primaryNumber = {
            number_id: this.billing_voip_subscriber.primaryNumber.id,
            cc: this.billing_voip_subscriber.primaryNumber.cc,
            ac: +this.billing_voip_subscriber.primaryNumber.ac,
            sn: this.billing_voip_subscriber.primaryNumber.sn,
        }
        pbxUser.username = this.username
        pbxUser.domain = this.domain.domain
        return pbxUser
    }

    toInternalBanSubscriber(): internal.BanSubscriber {
        const subscriber = new internal.BanSubscriber()
        subscriber.id = this.billing_voip_subscriber.id
        subscriber.resellerId = this.contract.contact.reseller_id
        subscriber.username = this.webusername
        subscriber.banIncrementStage = this.ban_increment_stage
        subscriber.lastBannedIp = this.last_banned_ip
        subscriber.lastBannedAt = this.last_banned_at
        return subscriber
    }
}
