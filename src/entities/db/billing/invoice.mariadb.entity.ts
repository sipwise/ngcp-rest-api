import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {internal} from '~/entities'
import {Contract} from '~/entities/db/billing/contract.mariadb.entity'
import {InvoiceGenerator} from '~/entities/internal/invoice.internal.entity'

@Entity({
    name: 'invoices',
    database: 'billing',
})
export class Invoice extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

    @Column({
        type: 'varchar',
        length: 32,
        nullable: false,
        unique: true,
    })
        serial!: string

    @Column({
        type: 'datetime',
        nullable: false,
    })
        period_start!: Date

    @Column({
        type: 'datetime',
        nullable: false,
    })
        period_end!: Date

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        amount_net!: number

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        amount_vat!: number

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        amount_total!: number

    // the pdf, only read when requested explicitly
    @Column({
        type: 'longblob',
        nullable: true,
        select: false,
    })
        data?: Buffer

    @Column({
        type: 'datetime',
        nullable: true,
    })
        sent_date?: Date

    @Column({
        type: 'enum',
        enum: InvoiceGenerator,
        nullable: true,
    })
        generator?: InvoiceGenerator

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
        contract?: Contract

    toInternal(): internal.Invoice {
        const invoice = new internal.Invoice()
        invoice.id = this.id
        invoice.contractId = this.contract_id
        invoice.serial = this.serial
        invoice.periodStart = this.period_start
        invoice.periodEnd = this.period_end
        invoice.amountNet = this.amount_net
        invoice.amountVat = this.amount_vat
        invoice.amountTotal = this.amount_total
        invoice.data = this.data
        invoice.sentDate = this.sent_date
        invoice.generator = this.generator
        return invoice
    }

    fromInternal(invoice: internal.Invoice): Invoice {
        this.id = invoice.id
        this.contract_id = invoice.contractId
        this.serial = invoice.serial
        this.period_start = invoice.periodStart
        this.period_end = invoice.periodEnd
        this.amount_net = invoice.amountNet
        this.amount_vat = invoice.amountVat
        this.amount_total = invoice.amountTotal
        this.data = invoice.data
        this.sent_date = invoice.sentDate
        this.generator = invoice.generator
        return this
    }
}
