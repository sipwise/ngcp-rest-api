
export class CustomerBalanceSearchDto {
    customer_id: string = undefined
    external_id: string = undefined
    reseller_id: number = undefined
    contact_id: number = undefined
    status: string = undefined
    _alias = {
        id: 'customerBalance.id',
        customer_id: 'customerBalance.contract_id',
        external_id: 'contract.external_id',
        reseller_id: 'contact.reseller_id',
        contact_id: 'contact.id',
        status: 'contract.status',
    }
}
