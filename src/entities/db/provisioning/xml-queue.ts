import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'xmlqueue',
    database: 'provisioning',
})
export class XmlQueue extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        type: 'varchar',
        length: 255,
    })
        target: string

    @Column({
        type: 'text',
    })
        body: string

    @Column({
        type: 'int',
        width: 10,
    })
        ctime: number

    @Column({
        type: 'int',
        width: 10,
    })
        atime: number

    @Column({
        type: 'int',
        width: 10,
    })
        tries: number

    @Column({
        type: 'int',
        width: 10,
    })
        next_try: number
}
