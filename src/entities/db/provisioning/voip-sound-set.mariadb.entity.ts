import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_sound_sets',
    database: 'provisioning',
})
export class VoipSoundSet extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        reseller_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        contract_id?: number

    @Column({
        type: 'varchar',
        length: 256,
        nullable: true,
    })
        name?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        description?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        contract_default!: boolean

    @Column({
        type: 'int',
        nullable: true,
    })
        parent_id?: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        expose_to_customer!: boolean
}
