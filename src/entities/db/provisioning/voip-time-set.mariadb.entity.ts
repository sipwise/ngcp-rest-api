import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {internal} from '~/entities'
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
        unsigned: true,
        nullable: true,
        default: null,
    })
        contract_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
        default: null,
    })
        subscriber_id?: number

    @ManyToOne(() => Reseller, reseller => reseller.voipTimeSets)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    toInternal(): internal.TimeSet {
        const entity = new internal.TimeSet()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        return entity
    }

    fromInternal(entity: internal.TimeSet): VoipTimeSet {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        return this
    }
}
