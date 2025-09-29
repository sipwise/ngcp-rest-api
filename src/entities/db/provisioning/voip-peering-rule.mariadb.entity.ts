import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPeeringGroup} from './voip-peering-group.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'voip_peer_rules',
    database: 'provisioning',
})
export class VoipPeeringRule extends BaseEntity {

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
        length: 64,
        nullable: false,
        default: '',
    })
        callee_prefix!: string

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: '',
    })
        callee_pattern?: string | null


    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
        caller_pattern?: string | null

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
        default: '',
    })
        description!: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        enabled!: boolean

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        stopper!: boolean

    @ManyToOne(() => VoipPeeringGroup, group => group.rules)
    @JoinColumn({name: 'group_id'})
        group?: VoipPeeringGroup

    toInternal(): internal.VoipPeeringRule {
        const entity = new internal.VoipPeeringRule()
        entity.id = this.id
        entity.groupId = this.group_id
        entity.calleePrefix = this.callee_prefix
        entity.calleePattern = this.callee_pattern
        entity.callerPattern = this.caller_pattern
        entity.description = this.description
        entity.enabled = this.enabled
        entity.stopper = this.stopper
        return entity
    }

    fromInternal(entity: internal.VoipPeeringRule): VoipPeeringRule {
        this.id = entity.id
        this.group_id = entity.groupId
        this.callee_prefix = entity.calleePrefix
        this.callee_pattern = entity.calleePattern
        this.caller_pattern = entity.callerPattern
        this.description = entity.description
        this.enabled = entity.enabled
        this.stopper = entity.stopper
        return this
    }
}
