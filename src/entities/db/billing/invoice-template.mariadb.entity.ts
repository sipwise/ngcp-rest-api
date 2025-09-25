import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {internal} from '~/entities'
import {Reseller} from '~/entities/db/billing/reseller.mariadb.entity'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

@Entity({
    name: 'invoice_templates',
    database: 'billing',
})
export class InvoiceTemplate extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
        default: '',
    })
        name!: string

    @Column({
        type: 'enum',
        enum: InvoiceTemplateType,
        nullable: false,
        default: InvoiceTemplateType.SVG,
    })
        type!: InvoiceTemplateType

    @Column({
        type: 'mediumblob',
        nullable: true,
    })
        data?: Buffer

    @Column({
        type: 'enum',
        enum: InvoiceTemplateCallDirection,
        nullable: false,
        default: InvoiceTemplateCallDirection.Out,
    })
        call_direction!: InvoiceTemplateCallDirection

    @Column({
        type: 'enum',
        enum: InvoiceTemplateCategory,
        nullable: false,
        default: InvoiceTemplateCategory.Customer,
    })
        category!: InvoiceTemplateCategory

    @ManyToOne(() => Reseller, reseller => reseller.id)
    @JoinColumn({name: 'reseller_id'})
        reseller?: Reseller

    toInternal(): internal.InvoiceTemplate {
        const template = new internal.InvoiceTemplate()
        template.id = this.id
        template.resellerId = this.reseller_id
        template.name = this.name
        template.type = this.type
        template.data = this.data
        template.callDirection = this.call_direction
        template.category = this.category
        return template
    }

    fromInternal(template: internal.InvoiceTemplate): InvoiceTemplate {
        this.id = template.id
        this.reseller_id = template.resellerId
        this.name = template.name
        this.type = template.type
        this.data = template.data
        this.call_direction = template.callDirection
        this.category = template.category
        return this
    }
}
