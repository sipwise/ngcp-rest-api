import {ApiPropertyOptional} from '@nestjs/swagger'

export class BanRegistrationSearchDto {
    @ApiPropertyOptional({description: 'SIP username of the banned registrations'})
        username: string = undefined
    @ApiPropertyOptional({description: 'SIP domain of the banned registrations'})
        domain: string = undefined
    @ApiPropertyOptional({description: 'Number of failed authentication attempts'})
        auth_count: string = undefined
    @ApiPropertyOptional({description: 'Time of the last failed authentication attempt'})
        last_auth: string = undefined
    @ApiPropertyOptional({description: 'Id of the registration ban'})
        id: string = undefined
}