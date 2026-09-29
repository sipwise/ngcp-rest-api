import {ApiPropertyOptional} from '@nestjs/swagger'

export class AuthTokenSearchDto {
    @ApiPropertyOptional()
        username: string = undefined
    @ApiPropertyOptional()
        id: string = undefined
}
