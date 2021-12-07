import {BaseEntity, Column, Entity, ManyToMany, PrimaryGeneratedColumn} from 'typeorm'
import {XmlHostgroup} from './xml-hostgroup'
import {XmlHost} from './xml-host'

@Entity({
    name: 'xmlgroups',
    database: 'provisioning',
})
export class XmlGroup extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({length: 32})
    name!: string

    @ManyToMany(type => XmlHost, host => host.groups)
    hosts: XmlHost[]
}
