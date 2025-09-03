import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipPeeringGroup} from './voip-peering-group.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'voip_peer_hosts',
    database: 'provisioning',
})
export class VoipPeeringServer extends BaseEntity {

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
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
        ip!: string

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
    })
        host?: string

    @Column({
        type: 'int',
        width: 5,
        unsigned: true,
        nullable: false,
        default: 5060,
    })
        port!: number

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: true,
        default: null,
    })
        transport?: number

    @Column({
        type: 'tinyint',
        width: 3,
        unsigned: true,
        nullable: false,
        default: 0,
    })
        weight!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        default: null,
    })
        via_route?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        via_lb!: boolean

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
        probe!: boolean

    @ManyToOne(() => VoipPeeringGroup, group => group.servers)
    @JoinColumn({name: 'group_id'})
        group?: VoipPeeringGroup

    toInternal(): internal.VoipPeeringServer {
        const entity = new internal.VoipPeeringServer()
        entity.id = this.id
        entity.groupId = this.group_id
        entity.name = this.name
        entity.ip = this.ip
        entity.host = this.host
        entity.port = this.port
        entity.transport = this.transport
        entity.weight = this.weight
        entity.viaRoute = this.via_route
        entity.viaLB = this.via_lb
        entity.enabled = this.enabled
        entity.probe = this.probe
        return entity
    }

    fromInternal(entity: internal.VoipPeeringServer): VoipPeeringServer {
        this.id = entity.id
        this.group_id = entity.groupId
        this.name = entity.name
        this.ip = entity.ip
        this.host = entity.host
        this.port = entity.port
        this.transport = entity.transport
        this.weight = entity.weight
        this.via_route = entity.viaRoute
        this.via_lb = entity.viaLB
        this.enabled = entity.enabled
        this.probe = entity.probe
        return this
    }
}
