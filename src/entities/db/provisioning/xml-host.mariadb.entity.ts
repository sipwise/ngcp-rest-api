import {BaseEntity, Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn} from 'typeorm'

import {XmlGroup} from './xml-group.mariadb.entity'

@Entity({
    name: 'xmlhosts',
    database: 'provisioning',
})
export class XmlHost extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 15,
        nullable: false,
    })
        ip!: string

    @Column({
        type: 'int',
        width: 5,
        unsigned: true,
        nullable: false,
    })
        port!: number

    @Column({
        type: 'varchar',
        length: 64,
        nullable: false,
        default: '/',
    })
        path!: string

    @Column({
        type: 'int',
        width: 5,
        unsigned: true,
        nullable: true,
    })
        sip_port?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        description?: string

    @ManyToMany(() => XmlGroup, group => group.hosts)
    @JoinTable({
        name: 'xmlhostgroups',
        joinColumn: {name: 'host_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'group_id', referencedColumnName: 'id'},
    })
        groups!: XmlGroup[]
}
