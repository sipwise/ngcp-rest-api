import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanAdminSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        username: string = undefined
    @ApiHideProperty()
    _alias = {
        id: 'admin.id',
        username: 'login',
    }
}