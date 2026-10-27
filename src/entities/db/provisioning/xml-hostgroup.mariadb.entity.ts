import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'xmlhostgroups',
    database: 'provisioning',
})
export class XmlHostgroup extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        group_id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        host_id!: number
}
