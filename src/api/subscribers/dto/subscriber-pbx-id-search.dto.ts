import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class SubscriberPbxIdSearchDto {
    @ApiPropertyOptional({description: 'Id of the subscriber'})
        value: number
    @ApiHideProperty()
        _alias = {
            value: 'target.id',
        }
}
