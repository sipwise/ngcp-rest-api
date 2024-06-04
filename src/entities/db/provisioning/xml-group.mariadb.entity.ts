import {BaseEntity, Column, Entity, ManyToMany, PrimaryGeneratedColumn} from 'typeorm'
import {XmlHost} from './xml-host.mariadb.entity'

@Entity({
    name: 'xmlgroups',
    database: 'provisioning',
})
export class XmlGroup extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 32,
        nullable: false,
    })
        name!: string

    @ManyToMany(type => XmlHost, host => host.groups)
        hosts!: XmlHost[]
}
