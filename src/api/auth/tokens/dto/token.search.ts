import {ApiPropertyOptional} from '@nestjs/swagger'

export class AuthTokenSearchDto {
    @ApiPropertyOptional()
        id: string = undefined
    @ApiPropertyOptional()
        reseller_id?: number = undefined
    @ApiPropertyOptional()
        username: string = undefined
}
