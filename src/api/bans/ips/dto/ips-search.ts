import {ApiPropertyOptional} from '@nestjs/swagger'

export class BanIpSearchDto {
    @ApiPropertyOptional({description: 'Banned IP address'})
        ip: string = undefined
    @ApiPropertyOptional({description: 'Id of the IP ban'})
        id: string = undefined
}