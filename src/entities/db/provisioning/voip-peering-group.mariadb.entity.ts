import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPeeringServer} from './voip-peering-server.mariadb.entity'

import {internal} from '~/entities'
import {Contract} from '~/entities/db/billing'
import {VoipPeeringInboundRule} from '~/entities/db/provisioning/voip-peering-inbound-rule.mariadb.entity'
import {VoipPeeringRule} from '~/entities/db/provisioning/voip-peering-rule.mariadb.entity'

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
        type: 'tinyint',
        width: 1,
        unsigned: true,
        nullable: false,
    })
        has_inbound_rules: number

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

    @OneToMany(() => VoipPeeringServer, server => server.group)
        servers!: VoipPeeringServer[]

    @OneToMany(() => VoipPeeringInboundRule, rule => rule.group)
        inboundRules!: VoipPeeringServer[]

    @OneToMany(() => VoipPeeringRule, rule => rule.group)
        rules!: VoipPeeringServer[]

    toInternal(): internal.VoipPeeringGroup {
        const entity = new internal.VoipPeeringGroup()
        entity.id = this.id
        entity.name = this.name
        entity.description = this.description
        entity.priority = this.priority
        entity.peeringContractId = this.peering_contract_id
        entity.hasInboundRules = this.has_inbound_rules
        entity.timeSetId = this.time_set_id
        return entity
    }

    fromInternal(entity: internal.VoipPeeringGroup): VoipPeeringGroup {
        this.id = entity.id
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.peering_contract_id = entity.peeringContractId
        this.has_inbound_rules = entity.hasInboundRules
        this.time_set_id = entity.timeSetId
        return this
    }
}
