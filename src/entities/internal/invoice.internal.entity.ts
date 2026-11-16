export enum InvoiceGenerator {
    Auto = 'auto',
    Web = 'web',
}

export class Invoice {
    id: number
    contractId: number
    serial: string
    periodStart: Date
    periodEnd: Date
    amountNet: number
    amountVat: number
    amountTotal: number
    data?: Buffer
    sentDate?: Date
    generator?: InvoiceGenerator
    // template and calendar month (YYYY-MM) the invoice is created with, not stored
    period?: string
    templateId?: number
    // zone of the owner for tz=owner, not stored
    ownerTimezone?: string
}
