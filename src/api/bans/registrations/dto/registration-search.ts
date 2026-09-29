import {ApiPropertyOptional} from '@nestjs/swagger'

export class BanRegistrationSearchDto {
    @ApiPropertyOptional()
        username: string = undefined
    @ApiPropertyOptional()
        domain: string = undefined
    @ApiPropertyOptional()
        auth_count: string = undefined
    @ApiPropertyOptional()
        last_auth: string = undefined
    @ApiPropertyOptional()
        id: string = undefined
}