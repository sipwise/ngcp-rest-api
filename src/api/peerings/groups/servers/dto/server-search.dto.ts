import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringGroupServerSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        group_id: number
    @ApiPropertyOptional()
        ip: string
    @ApiPropertyOptional()
        host?: string | null
    @ApiPropertyOptional()
        port: number
    @ApiPropertyOptional()
        transport: number
    @ApiPropertyOptional()
        weight: number
    @ApiPropertyOptional()
        via_route: string | null
    @ApiPropertyOptional()
        via_lb: boolean
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        probe: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'server.id',
        }
}
