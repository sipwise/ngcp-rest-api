import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'email_templates',
    database: 'billing',
})
export class EmailTemplate extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        from_email!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        subject!: string

    @Column({
        type: 'varchar',
        length: 255,
    })
        body!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
        default: '',
    })
        attachment_name!: string

}
