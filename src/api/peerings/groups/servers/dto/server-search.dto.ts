import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupServerSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        group_id: number = undefined
    @ApiPropertyOptional()
        ip: string = undefined
    @ApiPropertyOptional()
        host?: string | null = undefined
    @ApiPropertyOptional()
        port: number = undefined
    @ApiPropertyOptional()
        transport: number = undefined
    @ApiPropertyOptional()
        weight: number = undefined
    @ApiPropertyOptional()
        via_route: string | null = undefined
    @ApiPropertyOptional()
        via_lb: boolean = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        probe: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'server.id',
    }
}
