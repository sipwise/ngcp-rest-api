import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {internal} from '~/entities'
import {Contract} from '~/entities/db/billing'

@Entity({
    name: 'voip_peer_groups',
    database: 'provisioning',
})
export class VoipPeeringGroup extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: false,
        default: 1,
    })
        priority!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        description?: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        peering_contract_id?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        time_set_id?: number

    @ManyToOne(() => Contract, contract => contract.peeringGroups, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'peering_contract_id'})
        contract?: Contract

    toInternal(): internal.VoipPeeringGroup {
        const entity = new internal.VoipPeeringGroup()
        entity.id = this.id
        entity.name = this.name
        entity.description = this.description
        entity.priority = this.priority
        entity.peeringContractId = this.peering_contract_id
        entity.timeSetId = this.time_set_id
        return entity
    }

    fromInternal(entity: internal.VoipPeeringGroup): VoipPeeringGroup {
        this.id = entity.id
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.peering_contract_id = entity.peeringContractId
        this.time_set_id = entity.timeSetId
        return this
    }
}
