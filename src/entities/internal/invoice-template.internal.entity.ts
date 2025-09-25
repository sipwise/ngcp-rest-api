export enum InvoiceTemplateType {
    SVG = 'svg',
    HTML = 'html',
}

export enum InvoiceTemplateCallDirection {
   In = 'in',
   Out = 'out',
   InOut = 'in_out',
}

export enum InvoiceTemplateCategory {
    Customer = 'customer',
    Reseller = 'reseller',
    Peer = 'peer',
    Did = 'did',
}

export class InvoiceTemplate {
    id: number
    resellerId?: number
    name: string
    type: InvoiceTemplateType
    data?: Buffer
    callDirection?: InvoiceTemplateCallDirection
    category?: InvoiceTemplateCategory
}
