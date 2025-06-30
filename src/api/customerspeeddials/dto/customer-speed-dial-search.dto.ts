export class CustomerSpeedDialSearchDto {
    customer_id: number = undefined
    slot: string = undefined
    destination: string = undefined
    _alias = {
        id: 'csd.id',
        customer_id: 'contract_id',
    }
}
