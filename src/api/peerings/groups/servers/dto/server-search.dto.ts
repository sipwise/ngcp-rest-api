export class PeeringGroupServerSearchDto {
    name: string = undefined
    group_id: number = undefined
    ip: string = undefined
    host?: string | null = undefined
    port: number = undefined
    transport: number = undefined
    weight: number = undefined
    via_route: string | null = undefined
    via_lb: boolean = undefined
    enabled: boolean = undefined
    probe: boolean = undefined
    _alias = {
        id: 'server.id',
    }
}
