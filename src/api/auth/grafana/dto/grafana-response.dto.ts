import {ApiProperty} from '@nestjs/swagger'
import {IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'

export class AuthGrafanaResponseDto extends ResponseDto {
    static readonly userHeader = 'NGCP-Grafana-User'

    @IsString()
    @ApiProperty({description: 'Grafana user'})
        grafana_user: string
}
