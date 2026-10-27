import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPreference} from './voip-preference.mariadb.entity'

@Entity({
    name: 'voip_contract_preferences',
    database: 'provisioning',
})
export class VoipContractPreference extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

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

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        location_id?: number

    @ManyToOne(() => VoipPreference, voipPreference => voipPreference.id)
    @JoinColumn({name: 'attribute_id'})
        voipPreference!: VoipPreference
}