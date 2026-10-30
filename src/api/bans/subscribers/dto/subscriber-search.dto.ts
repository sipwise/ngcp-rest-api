import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanSubscriberSearchDto {
    @ApiPropertyOptional()
        reseller_id: number
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        username: string
    @ApiHideProperty()
        _alias = {
            id: 'bSubscriber.id',
            'username': 'webusername',
        }
}