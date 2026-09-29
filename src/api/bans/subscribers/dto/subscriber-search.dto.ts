import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanSubscriberSearchDto {
    @ApiPropertyOptional()
        reseller_id: number = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        username: string = undefined
    @ApiHideProperty()
    _alias = {
        id: 'bSubscriber.id',
        'username': 'webusername',
    }
}