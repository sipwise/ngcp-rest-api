interface DomainResponseDtoAttributes {
    id: number;
    domain: string;
    reseller_id: number;
}

export class DomainResponseDto implements DomainResponseDtoAttributes {
    domain: string
    id: number
    reseller_id: number
}
