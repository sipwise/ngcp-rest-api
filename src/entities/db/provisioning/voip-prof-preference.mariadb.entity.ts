import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Timestamp} from 'typeorm'
import {VoipPreference} from './voip-preference.mariadb.entity'
import {internal} from '../..'

@Entity({
    name: 'voip_usr_preferences',
    database: 'provisioning',
})
export class VoipProfPreference extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 11,
        nullable: false,
    })
        profile_id: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 11,
        nullable: false,
    })
        attribute_id: number

    @Column({
        type: 'varchar',
        width: 128,
        nullable: false,
    })
        value: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
        onUpdate: "CURRENT_TIMESTAMP",
    })
        modify_timestamp: Timestamp

    @ManyToOne(() => VoipPreference, voipPreference => voipPreference.id)
    @JoinColumn({name: 'attribute_id'})
    voipPreference: VoipPreference
}