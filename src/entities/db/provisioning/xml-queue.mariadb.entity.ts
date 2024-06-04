import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'xmlqueue',
    database: 'provisioning',
})
export class XmlQueue extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        target!: string

    @Column({
        type: 'text',
        nullable: false,
    })
        body!: string

    @Column({
        type: 'int',
        width: 10,
        unsigned: true,
        nullable: false,
    })
        ctime!: number

    @Column({
        type: 'int',
        width: 10,
        unsigned: true,
        nullable: false,
    })
        atime!: number

    @Column({
        type: 'int',
        width: 10,
        unsigned: true,
        nullable: false,
    })
        tries!: number

    @Column({
        type: 'int',
        width: 10,
        unsigned: true,
        nullable: false,
    })
        next_try!: number
}
