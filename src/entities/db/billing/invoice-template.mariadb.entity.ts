import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

import {InvoiceTemplateCallDirection, InvoiceTemplateType} from '~/entities/internal/invoice-template.internal.entity'

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
}
