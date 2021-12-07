import {BaseEntity, Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn} from 'typeorm'
import {XmlGroup} from './xml-group'

@Entity({
    name: 'xmlhosts',
    database: 'provisioning',
})
export class XmlHost extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'varchar',
        length: 15,
    })
    ip!: string

    @Column({
        type: 'int',
        width: 5,
    })
    port: number

    @Column({
        type: 'varchar',
        length: 64,
        default: '/',
    })
    path: string

    @Column({
        type: 'int',
        width: 5,
    })
    sip_port: number

    @Column({
        type: 'varchar',
        length: 255,
    })
    description: string

    @ManyToMany(type => XmlGroup, group => group.hosts)
    @JoinTable({
        name: 'xmlhostgroups',
        joinColumn: {name: 'host_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'group_id', referencedColumnName: 'id'},
    })
    groups: XmlGroup[]
}
