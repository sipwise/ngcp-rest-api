interface DomainInterface {
    id?: number;
    domain?: string;
    reseller_id?: number;
}

export class Domain implements DomainInterface {
    domain?: string
    id?: number
    reseller_id?: number
}
