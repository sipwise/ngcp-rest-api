import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class NumberSearchDto {
    @ApiPropertyOptional({description: 'Subscriber the number is assigned to'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'Primary number of its subscriber'})
        is_primary: boolean
    @ApiPropertyOptional({description: 'Device id alias: the subscriber can register with it and receives only calls to it'})
        is_devid: boolean
    @ApiPropertyOptional({description: 'Id of the number'})
        number_id: number
    @ApiPropertyOptional({description: 'Country code'})
        cc: number
    @ApiPropertyOptional({description: 'Area code, may be empty'})
        ac: string
    @ApiPropertyOptional({description: 'Subscriber number'})
        sn: string
    @ApiPropertyOptional({description: 'Id of the number'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'voipNumber.id',
        }
}