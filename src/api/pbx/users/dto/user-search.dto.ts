import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxUserSearchDto {
    @ApiPropertyOptional({description: 'Id of the PBX user'})
        id: number
    @ApiPropertyOptional({description: 'Name shown on provisioned phones and as network-provided display name in calls'})
        display_name: string
    @ApiPropertyOptional({description: 'Extension for short dialling'})
        pbx_extension: string
    @ApiHideProperty()
        _alias = {
            id: 'bSubscriber.id',
        }
}