import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {Reseller} from '~/entities/db/billing'

@Entity({
    name: 'voip_time_sets',
    database: 'provisioning',
})
export class VoipTimeSet extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        reseller_id!: number

    @Column({
        type: 'varchar',
        length: 90,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        contract_id?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        subscriber_id?: number

    @ManyToOne(() => Reseller, reseller => reseller.journals)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller
}
