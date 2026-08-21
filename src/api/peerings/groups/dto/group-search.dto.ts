export class PeeringGroupSearchDto {
    contract_id: number = undefined
    name: string = undefined
    description: number = undefined
    time_set_id: number = undefined
    priority: number = undefined
    _alias = {
        contract_id: 'vpg.peering_contract_id',
    }
}
