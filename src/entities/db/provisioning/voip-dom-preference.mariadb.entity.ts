import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPreference} from './voip-preference.mariadb.entity'

@Entity({
    name: 'voip_usr_preferences',
    database: 'provisioning',
})
export class VoipDomPreference extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

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
        attribute_id!: number

    @Column({
        type: 'varchar',
        nullable: false,
    })
        value!: string

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        modify_timestamp!: Date

    @ManyToOne(() => VoipPreference, voipPreference => voipPreference.id)
    @JoinColumn({name: 'attribute_id'})
        voipPreference!: VoipPreference
}