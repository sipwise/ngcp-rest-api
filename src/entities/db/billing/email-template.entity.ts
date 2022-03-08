import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'email_templates',
    database: 'billing',
})
export class EmailTemplate extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 255,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
    })
        from_email!: string

    @Column({
        type: 'varchar',
        length: 255,
    })
        subject!: string

    @Column({
        type: 'varchar',
    })
        body!: string

    @Column({
        type: 'varchar',
        length: 255,
    })
        attachment_name!: string

}
