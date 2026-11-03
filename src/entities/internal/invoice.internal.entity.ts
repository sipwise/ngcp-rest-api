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
    // template the invoice is created with, not stored
    templateId?: number
}
