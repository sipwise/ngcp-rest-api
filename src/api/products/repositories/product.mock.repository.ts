import {NotFoundException} from '@nestjs/common'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ProductClass} from '../../../entities/internal/product.internal.entity'
import {ProductRepository} from '../interfaces/product.repository'

interface ProductMockDB {
    [key: number]: internal.Product
}

export class ProductMockRepository implements ProductRepository {
    private readonly productDB: ProductMockDB

    constructor() {
        this.productDB = {
            1: internal.Product.create({
                class: ProductClass.PstnPeering,
                handle: 'PSTN_PEERING',
                id: 1,
                name: ' PSTN Peering',
                on_sale: true,
            }),
            2: internal.Product.create({
                class: ProductClass.SipPeering,
                handle: 'SIP_PEERING',
                id: 2,
                name: ' SIP Peering',
                on_sale: true,
            }),
            3: internal.Product.create({
                class: ProductClass.Reseller,
                handle: 'VOIP_RESELLER',
                id: 3,
                name: ' VoIP Reseller',
                on_sale: true,
            }),
            4: internal.Product.create({
                class: ProductClass.SipAccount,
                handle: 'SIP_ACCOUNT',
                id: 4,
                name: ' Basic SIP Account',
                on_sale: true,
            }),
            5: internal.Product.create({
                class: ProductClass.PbxAccount,
                handle: 'PBX_ACCOUNT',
                id: 5,
                name: ' Cloud PBX Account',
                on_sale: true,
            }),
        }
    }

    read(id: number, sr: ServiceRequest): Promise<internal.Product> {
        this.throwErrorIfIdNotExists(this.productDB, id)
        return Promise.resolve(this.productDB[id])
    }

    readAll(sr: ServiceRequest): Promise<[internal.Product[], number]> {
        const products: [internal.Product[], number] =
            [Object.keys(this.productDB).map(id => this.productDB[id]), Object.keys(this.productDB).length]
        return Promise.resolve(products)
    }

    private throwErrorIfIdNotExists(db: any, id: number) {
        if (db[id] == undefined)
            throw new NotFoundException()
    }
}