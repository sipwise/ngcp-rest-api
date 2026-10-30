import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanAdminSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        username: string
    @ApiHideProperty()
        _alias = {
            id: 'admin.id',
            username: 'login',
        }
}