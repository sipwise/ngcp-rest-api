import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPeeringGroup} from './voip-peering-group.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'voip_peer_inbound_rules',
    database: 'provisioning',
})
export class VoipPeeringInboundRule extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        group_id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        field: string

    @Column({
        type: 'varchar',
        length: 1023,
        nullable: false,
    })
        pattern: string

    @Column({
        type: 'int',
        width: 3,
        nullable: true,
        default: null,
    })
        reject_code?: number | null

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
        reject_reason?: string | null

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
        default: 50,
    })
        priority: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        enabled!: boolean

    @ManyToOne(() => VoipPeeringGroup, group => group.inboundRules)
    @JoinColumn({name: 'group_id'})
        group?: VoipPeeringGroup

    toInternal(): internal.VoipPeeringInboundRule {
        const entity = new internal.VoipPeeringInboundRule()
        entity.id = this.id
        entity.groupId = this.group_id
        entity.field = this.field
        entity.pattern = this.pattern
        entity.rejectCode = this.reject_code
        entity.rejectReason = this.reject_reason
        entity.priority = this.priority
        entity.enabled = this.enabled
        return entity
    }

    fromInternal(entity: internal.VoipPeeringInboundRule): VoipPeeringInboundRule {
        this.id = entity.id
        this.group_id = entity.groupId
        this.field = entity.field
        this.pattern = entity.pattern
        this.reject_code = entity.rejectCode
        this.reject_reason = entity.rejectReason
        this.priority = entity.priority
        this.enabled = entity.enabled
        return this
    }
}
