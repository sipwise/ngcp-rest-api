import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'xmlhostgroups',
    database: 'provisioning',
})
export class XmlHostgroup extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'int',
        width: 11,
    })
    group_id: number

    @Column({
        type: 'int',
        width: 11,
    })
    host_id: number
}
