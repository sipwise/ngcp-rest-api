import {ApiPropertyOptional} from '@nestjs/swagger'

export class AuthTokenSearchDto {
    @ApiPropertyOptional({description: 'Id of the auth token'})
        id: string = undefined
    @ApiPropertyOptional({description: 'Reseller of the token owner'})
        reseller_id?: number = undefined
    @ApiPropertyOptional({description: 'Login of the token owner'})
        username: string = undefined
}
