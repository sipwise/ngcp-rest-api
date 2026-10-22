import {IncomingHttpHeaders} from 'http'

import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsOptional} from 'class-validator'

export class AuthGrafanaRequestDto {
    static readonly editHeader = 'NGCP-Grafana-Edit'

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'Request Grafana edit (admin) access. Takes precedence over the NGCP-Grafana-Edit header', default: false})
        grafana_edit?: boolean

    static isEdit(dto: AuthGrafanaRequestDto, headers: IncomingHttpHeaders): boolean {
        if (dto?.grafana_edit !== undefined)
            return dto.grafana_edit
        const value = headers[this.editHeader.toLowerCase()]
        return typeof value === 'string' && value.trim() === '1'
    }
}
