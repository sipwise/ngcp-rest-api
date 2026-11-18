import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class BanSubscriberSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the subscriber'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Id of the banned subscriber'})
        id: number
    @ApiPropertyOptional({description: 'Web login of the subscriber'})
        username: string
    @ApiHideProperty()
        _alias = {
            id: 'bSubscriber.id',
            'username': 'webusername',
        }
}