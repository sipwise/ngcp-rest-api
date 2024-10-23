import {Contact, Contract, Domain, Journal} from '~/entities/db/billing'

export enum ResellerStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

export interface ResellerInternalEntity {
    id?: number
    contract_id: number
    name: string
    status: ResellerStatus
}

export class Reseller implements ResellerInternalEntity {
    id?: number
    contract_id!: number
    name!: string
    status!: ResellerStatus
    contract?: Contract
    contacts?: Contact[]
    domains?: Domain[]
    journals?: Journal[]

    // Vouchers?: Voucher[]

    // Products?: Product[]

    // BillingNetworks?: BillingNetwork[]

    // ProfilePackages?: ProfilePackage[]

    // BillingProfiles?: BillingProfile[]

    // VoipNumbers?: VoipNumber[]

    // customers?: Customer[]

    // NcosLevels?: NcosLevel[]

    // Orders?: Order[]

    static create(data: ResellerInternalEntity): Reseller {
        const reseller = new Reseller()

        Object.keys(data).map(key => {
            reseller[key] = data[key]
        })
        return reseller
    }
}