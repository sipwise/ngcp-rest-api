import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '~/entities'

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

    toInternal(): internal.EmailTemplate {
        const template = new internal.EmailTemplate()
        template.id = this.id
        template.resellerId = this.reseller_id
        template.name = this.name
        template.fromEmail = this.from_email
        template.subject = this.subject
        template.attachmentName = this.attachment_name
        return template
    }
}
