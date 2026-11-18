import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanAdminSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the admin'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Id of the banned admin'})
        id: number
    @ApiPropertyOptional({description: 'Login of the admin'})
        username: string
    @ApiHideProperty()
        _alias = {
            id: 'admin.id',
            username: 'login',
        }
}