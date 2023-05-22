import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {InvoiceTemplateCallDirection, InvoiceTemplateType} from '../../internal/invoice-template.internal.entity'

@Entity({
    name: 'invoice_templates',
    database: 'billing',
})
export class InvoiceTemplate extends BaseEntity {

    @PrimaryGeneratedColumn()
        id: number

    @Column({
        type: 'int',
        width: 11,
        nullable: false,
    })
        reseller_id: number

    @Column({
        type: 'varchar',
        length: 255,
        default: '',
        nullable: false,
    })
        name: string

    @Column({
        type: 'enum',
        enum: InvoiceTemplateType,
        nullable: false,
        default: InvoiceTemplateType.SVG,
    })
        type: InvoiceTemplateType

    @Column({
        nullable: true,
        type: 'mediumblob',
        default: null,
    })
        data?: Buffer

    @Column({
        type: 'enum',
        enum: InvoiceTemplateCallDirection,
        nullable: false,
        default: InvoiceTemplateCallDirection.Out,
    })
        call_direction: InvoiceTemplateCallDirection
}
