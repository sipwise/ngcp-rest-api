export enum ProductClass {
    SipPeering = 'sippeering',
    PstnPeering = 'pstnpeering',
    Reseller = 'reseller',
    SipAccount = 'sipaccount',
    PbxAccount = 'pbxaccount'
}

interface ProductInternalEntity {
    id?: number
    reseller_id?: number
    class: ProductClass
    handle: string
    name: string
    on_sale
    price?: number
    weight?: number
    billing_profile_id?: number
}

export class Product implements ProductInternalEntity {
    id?: number
    reseller_id?: number
    class: ProductClass
    handle: string
    name: string
    on_sale!: boolean
    price?: number
    weight?: number
    billing_profile_id?: number

    static create(data: ProductInternalEntity): Product {
        const product = new Product()
        Object.keys(data).map(key => {
            product[key] = data[key]
        })
        return product
    }
}