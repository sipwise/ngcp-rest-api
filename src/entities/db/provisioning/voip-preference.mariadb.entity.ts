import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Timestamp} from 'typeorm'
import {VoipContractPreference} from './voip-contract-preference.mariadb.entity'
import {VoipDomPreference} from './voip-dom-preference.mariadb.entity'
import {VoipProfPreference} from './voip-prof-preference.mariadb.entity'
import {VoipUsrPreference} from './voip-usr-preference.mariadb.entity'
import {internal} from '../..'

export enum DataType {
    Boolean = 'boolean',
    Int = 'int',
    String = 'string',
    Enum = 'enum',
    Blob = 'blob',
}

@Entity({
    name: 'voip_preferences',
    database: 'provisioning',
})
export class VoipPreference extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 11,
        nullable: false,
    })
        voip_preference_groups_id: number

    @Column({
        type: 'varchar',
        width: 31,
        nullable: false,
    })
        attribute: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        label: string

    @Column({
        type: 'int',
        width: 3,
        nullable: false,
        default: 0,
    })
        type: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 3,
        nullable: false,
    })
        max_occur: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        usr_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        prof_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        dom_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        peer_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        contract_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        contract_location_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        dev_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        devprof_pref: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        fielddev_pref: number

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
        onUpdate: "CURRENT_TIMESTAMP",
    })
        modify_timestamp: Timestamp

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        internal: number

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        expose_to_customer: number

    @Column({
        type: 'enum',
        enum: DataType,
        nullable: true,
    })
        data_type: DataType

    @Column({
        type: 'int',
        width: 1,
        nullable: false,
        default: 0,
    })
        read_only: number

    @Column({
        type: 'text',
        nullable: true,
    })
        description: String

    @Column({
        type: 'int',
        unsigned: true,
        width: 1,
        nullable: false,
        default: 0,
    })
        dynamic: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 1,
        nullable: false,
        default: 0,
    })
        reseller_pref: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 1,
        nullable: false,
        default: 0,
    })
        expose_to_subscriber: number

    @OneToMany(() => VoipContractPreference, voipContractPreference => voipContractPreference.attribute_id)
    voipContractPreference?: VoipContractPreference

    @OneToMany(() => VoipDomPreference, voipDomPreference => voipDomPreference.attribute_id)
    voipDomPreference?: VoipDomPreference

    @OneToMany(() => VoipProfPreference, voipProfPreference => voipProfPreference.attribute_id)
    voipProfPreference?: VoipProfPreference

    @OneToMany(() => VoipUsrPreference, voipUsrPreference => voipUsrPreference.attribute_id)
    voipUsrPreference?: VoipUsrPreference
}
