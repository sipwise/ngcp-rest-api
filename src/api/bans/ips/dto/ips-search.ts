import {ApiPropertyOptional} from '@nestjs/swagger'

export class BanIpSearchDto {
    @ApiPropertyOptional()
        ip: string = undefined
    @ApiPropertyOptional()
        id: string = undefined
}