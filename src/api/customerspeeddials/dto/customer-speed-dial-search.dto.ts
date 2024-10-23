export class CustomerSpeedDialSearchDto {
    customer_id: number = undefined
    slot: string = undefined
    destination: string = undefined
    _alias = {
        customer_id: 'contract_id',
    }
}
