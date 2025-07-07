export interface ContractBalanceInterface {
    id?: number
    contractId?: number
    cashBalance?: number
    cashBalanceInterval?: number
    freeTimeBalance?: number
    freeTimeBalanceInterval?: number
    invoiceId?: number
    topupCount?: number
    timelyTopupCount?: number
    start?: Date
    end?: Date
    underrunProfiles?: Date
    underrunLock?: Date
    initialCashBalance?: number
    initialFreeTimeBalance?: number
    ratio?: number
    debit?: number
}

export class ContractBalance implements ContractBalanceInterface{
    id?: number
    contractId?: number
    cashBalance?: number
    cashBalanceInterval?: number
    freeTimeBalance?: number
    freeTimeBalanceInterval?: number
    invoiceId?: number
    topupCount?: number
    timelyTopupCount?: number
    start?: Date
    end?: Date
    underrunProfiles?: Date
    underrunLock?: Date
    initialCashBalance?: number
    initialFreeTimeBalance?: number
    ratio?: number
    debit?: number

    static create(data: ContractBalanceInterface): ContractBalance {
        const balance = new ContractBalance()

        Object.keys(data).map(key => {
            balance[key] = data[key]
        })
        return balance
    }
}