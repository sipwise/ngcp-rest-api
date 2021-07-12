interface DomainCreateDtoAttributes {
    domain: string;
    reseller_id: number;
}

export class DomainCreateDto implements DomainCreateDtoAttributes {
    domain: string
    reseller_id: number
}
