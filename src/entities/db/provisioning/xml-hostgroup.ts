import {BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contact, Contract} from '../billing'
import {XmlGroup} from './xml-group'

@Entity({
    name: 'xmlhostgroups',
    database: 'provisioning',
})
export class XmlHostgroup extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: "int",
        width: 11
    })
    group_id: number

    @Column({
        type: "int",
        width: 11
    })
    host_id: number
}
